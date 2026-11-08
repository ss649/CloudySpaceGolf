"""Training Script for AstroSensorNet.
"""

import os
import time
from typing import Dict, Any
import torch
from torch.utils.data import DataLoader

from ..models.astro_sensor_net import AstroSensorNet, TARGET_CLASSES
from .dataset import SkyCloudDataset
from .losses import AstroSensorLoss
from ..data_generator.generate_dataset import generate_batch

def train_astro_sensor_net(
    train_dir: str = "ml/data/train",
    val_dir: str = "ml/data/val",
    num_train_samples: int = 120,
    num_val_samples: int = 30,
    epochs: int = 5,
    batch_size: int = 16,
    lr: float = 1e-3,
    checkpoint_dir: str = "ml/checkpoints"
):
    os.makedirs(checkpoint_dir, exist_ok=True)
    
    # 1. Ensure dataset exists
    if not os.path.exists(train_dir) or len(os.listdir(train_dir)) < 10:
        print(f"Generating {num_train_samples} training samples in {train_dir}...")
        generate_batch(train_dir, num_samples=num_train_samples)
    if not os.path.exists(val_dir) or len(os.listdir(val_dir)) < 5:
        print(f"Generating {num_val_samples} validation samples in {val_dir}...")
        generate_batch(val_dir, num_samples=num_val_samples)
        
    train_dataset = SkyCloudDataset(train_dir)
    val_dataset = SkyCloudDataset(val_dir)
    
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, drop_last=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)
    
    print(f"Dataset loaded: {len(train_dataset)} train samples, {len(val_dataset)} val samples.")
    
    # 2. Model, Loss, Optimizer
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training on device: {device}")
    
    model = AstroSensorNet().to(device)
    criterion = AstroSensorLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)
    
    best_val_acc = 0.0
    best_checkpoint_path = os.path.join(checkpoint_dir, "astro_sensor_net.pt")
    
    start_time = time.time()
    for epoch in range(1, epochs + 1):
        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0
        
        for batch in train_loader:
            images = batch["image"].to(device)
            priors = batch["prior_vec"].to(device)
            targets = {
                "target_class": batch["target_class"].to(device),
                "offset_target": batch["offset_target"].to(device),
                "cloud_target": batch["cloud_target"].to(device),
            }
            
            optimizer.zero_grad()
            preds = model(images, priors)
            loss_dict = criterion(preds, targets)
            loss = loss_dict["total_loss"]
            
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            
            train_loss += loss.item() * images.size(0)
            pred_classes = preds["logits"].argmax(dim=-1)
            train_correct += (pred_classes == targets["target_class"]).sum().item()
            train_total += images.size(0)
            
        scheduler.step()
        train_loss /= max(1, train_total)
        train_acc = (train_correct / max(1, train_total)) * 100.0
        
        # Validation
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0
        pixel_error_sum = 0.0
        
        with torch.no_grad():
            for batch in val_loader:
                images = batch["image"].to(device)
                priors = batch["prior_vec"].to(device)
                targets = {
                    "target_class": batch["target_class"].to(device),
                    "offset_target": batch["offset_target"].to(device),
                    "cloud_target": batch["cloud_target"].to(device),
                }
                
                preds = model(images, priors)
                loss_dict = criterion(preds, targets)
                val_loss += loss_dict["total_loss"].item() * images.size(0)
                
                pred_classes = preds["logits"].argmax(dim=-1)
                val_correct += (pred_classes == targets["target_class"]).sum().item()
                val_total += images.size(0)
                
                # Compute pixel error in 256x256 image
                diff = (preds["pred_offset_uv"] - targets["offset_target"]) * 256.0
                pixel_error_sum += torch.norm(diff, dim=-1).sum().item()
                
        val_loss /= max(1, val_total)
        val_acc = (val_correct / max(1, val_total)) * 100.0
        avg_pixel_err = pixel_error_sum / max(1, val_total)
        
        print(f"Epoch {epoch}/{epochs} | "
              f"Train Loss: {train_loss:.4f}, Acc: {train_acc:.1f}% | "
              f"Val Loss: {val_loss:.4f}, Acc: {val_acc:.1f}%, Mean Pixel Error: {avg_pixel_err:.1f}px")
              
        if val_acc >= best_val_acc:
            best_val_acc = val_acc
            torch.save({
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "val_acc": val_acc,
                "classes": TARGET_CLASSES,
            }, best_checkpoint_path)
            
    total_time = time.time() - start_time
    print(f"\nTraining completed in {total_time:.1f}s.")
    print(f"Saved best model checkpoint to {best_checkpoint_path} (Best Val Acc: {best_val_acc:.1f}%)")

if __name__ == "__main__":
    train_astro_sensor_net()
