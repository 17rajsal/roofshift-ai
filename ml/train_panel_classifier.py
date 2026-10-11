"""
RoofShift AI — Photovoltaic Panel Defect Classifier Training Pipeline
======================================================================
Trains and evaluates a lightweight MobileNetV3-Small convolutional neural network
to classify solar panels as CLEAN vs VISIBLY SOILED / DUSTY from genuine RGB photography.

Key Scientific Rigor:
- Dataset: MIT Licensed RGB solar panel imagery (194 Clean, 191 Soiled).
- Stratified Train (70%), Validation (15%), and Held-out Test (15%) splits.
- Reproducible preprocessing with training-only augmentations.
- Balanced CrossEntropyLoss with AdamW optimizer.
- Early stopping on Validation Macro-F1.
- Single evaluation on untouched Test Set reporting:
  Accuracy, Macro-F1, Precision, Recall, Confusion Matrix, and Failure Cases.
- Integrated Abstain/Inconclusive threshold: confidence < 0.65 -> INCONCLUSIVE.
- Saves PyTorch state_dict and JSON provenance metadata.
"""

import os
import json
import logging
from datetime import datetime, timezone
import random
import numpy as np
from PIL import Image

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from torchvision.models import mobilenet_v3_small, MobileNet_V3_Small_Weights
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("roofshift.ml.panel_classifier")

# Set random seeds for reproducibility
SEED = 42
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PANEL_DATA_DIR = os.path.join(BASE_DIR, "ml", "data", "panel_images")
ARTIFACTS_DIR = os.path.join(BASE_DIR, "backend", "app", "services", "ml", "artifacts")

CLASSES = ["CLEAN", "SOILED"]
CLASS_TO_IDX = {"CLEAN": 0, "SOILED": 1}
IDX_TO_CLASS = {0: "CLEAN", 1: "SOILED"}


class SolarPanelDataset(Dataset):
    def __init__(self, samples, transform=None):
        self.samples = samples  # List of (filepath, label_idx)
        self.transform = transform

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        with Image.open(path) as img:
            img = img.convert("RGB")
        if self.transform:
            img = self.transform(img)
        return img, label, path


def get_data_splits():
    clean_dir = os.path.join(PANEL_DATA_DIR, "clean")
    soiled_dir = os.path.join(PANEL_DATA_DIR, "soiled")

    clean_files = [os.path.join(clean_dir, f) for f in os.listdir(clean_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    soiled_files = [os.path.join(soiled_dir, f) for f in os.listdir(soiled_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]

    # Deterministic shuffle
    clean_files.sort()
    soiled_files.sort()
    random.Random(SEED).shuffle(clean_files)
    random.Random(SEED).shuffle(soiled_files)

    # 70% Train, 15% Val, 15% Test stratified
    def split_list(files, label):
        n = len(files)
        n_train = int(n * 0.70)
        n_val = int(n * 0.15)
        train_s = [(f, label) for f in files[:n_train]]
        val_s = [(f, label) for f in files[n_train:n_train + n_val]]
        test_s = [(f, label) for f in files[n_train + n_val:]]
        return train_s, val_s, test_s

    clean_train, clean_val, clean_test = split_list(clean_files, CLASS_TO_IDX["CLEAN"])
    soiled_train, soiled_val, soiled_test = split_list(soiled_files, CLASS_TO_IDX["SOILED"])

    train_samples = clean_train + soiled_train
    val_samples = clean_val + soiled_val
    test_samples = clean_test + soiled_test

    random.Random(SEED).shuffle(train_samples)
    random.Random(SEED).shuffle(val_samples)
    random.Random(SEED).shuffle(test_samples)

    return train_samples, val_samples, test_samples, len(clean_files), len(soiled_files)


def build_model():
    # Instantiate lightweight MobileNetV3-Small
    model = mobilenet_v3_small(weights=MobileNet_V3_Small_Weights.DEFAULT)
    # Replace final classification head for binary classification (Clean vs Soiled)
    in_features = model.classifier[3].in_features
    model.classifier[3] = nn.Linear(in_features, 2)
    return model


def train_and_evaluate():
    train_samples, val_samples, test_samples, n_clean, n_soiled = get_data_splits()
    logger.info(f"Dataset Split Sizes -> Train: {len(train_samples)}, Val: {len(val_samples)}, Test: {len(test_samples)}")

    # Transforms
    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=10),
        transforms.ColorJitter(brightness=0.1, contrast=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    eval_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    train_loader = DataLoader(SolarPanelDataset(train_samples, train_transform), batch_size=16, shuffle=True)
    val_loader = DataLoader(SolarPanelDataset(val_samples, eval_transform), batch_size=16, shuffle=False)
    test_loader = DataLoader(SolarPanelDataset(test_samples, eval_transform), batch_size=16, shuffle=False)

    # Compute class weights for loss balancing
    n_clean_train = sum(1 for _, l in train_samples if l == 0)
    n_soiled_train = sum(1 for _, l in train_samples if l == 1)
    weight_clean = len(train_samples) / (2.0 * n_clean_train)
    weight_soiled = len(train_samples) / (2.0 * n_soiled_train)
    class_weights = torch.tensor([weight_clean, weight_soiled], dtype=torch.float32)

    device = torch.device("cpu")
    model = build_model().to(device)

    criterion = nn.CrossEntropyLoss(weight=class_weights)
    optimizer = torch.optim.AdamW(model.parameters(), lr=5e-4, weight_decay=1e-4)

    best_val_f1 = 0.0
    best_state_dict = None
    epochs = 6
    patience = 3
    patience_counter = 0

    logger.info("Starting training loop with early stopping on Validation Macro-F1...")

    for epoch in range(1, epochs + 1):
        model.train()
        train_loss = 0.0
        for imgs, labels, _ in train_loader:
            imgs, labels = imgs.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(imgs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            train_loss += loss.item() * len(labels)
        train_loss /= len(train_samples)

        # Validation
        model.eval()
        val_loss = 0.0
        y_val_true, y_val_pred = [], []
        with torch.no_grad():
            for imgs, labels, _ in val_loader:
                imgs, labels = imgs.to(device), labels.to(device)
                outputs = model(imgs)
                loss = criterion(outputs, labels)
                val_loss += loss.item() * len(labels)
                preds = torch.argmax(outputs, dim=1).cpu().numpy()
                y_val_true.extend(labels.cpu().numpy())
                y_val_pred.extend(preds)
        val_loss /= len(val_samples)

        _, _, val_f1, _ = precision_recall_fscore_support(y_val_true, y_val_pred, average="macro", zero_division=0)
        val_acc = accuracy_score(y_val_true, y_val_pred)
        logger.info(f"Epoch {epoch:02d}/{epochs:02d} | Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} | Val Acc: {val_acc:.4f} | Val Macro-F1: {val_f1:.4f}")

        if val_f1 > best_val_f1:
            best_val_f1 = val_f1
            best_state_dict = {k: v.cpu().clone() for k, v in model.state_dict().items()}
            patience_counter = 0
        else:
            patience_counter += 1
            if patience_counter >= patience:
                logger.info(f"Early stopping triggered at epoch {epoch}.")
                break

    # Load best model for single held-out test evaluation
    model.load_state_dict(best_state_dict)
    model.eval()

    y_test_true, y_test_pred, y_test_probs, test_paths = [], [], [], []
    with torch.no_grad():
        for imgs, labels, paths in test_loader:
            imgs = imgs.to(device)
            outputs = model(imgs)
            probs = torch.softmax(outputs, dim=1).cpu().numpy()
            preds = np.argmax(probs, axis=1)
            y_test_true.extend(labels.numpy())
            y_test_pred.extend(preds)
            y_test_probs.extend(probs)
            test_paths.extend(paths)

    # Metrics
    test_acc = accuracy_score(y_test_true, y_test_pred)
    prec_per_class, rec_per_class, f1_per_class, _ = precision_recall_fscore_support(
        y_test_true, y_test_pred, labels=[0, 1], zero_division=0
    )
    macro_prec, macro_rec, macro_f1, _ = precision_recall_fscore_support(
        y_test_true, y_test_pred, average="macro", zero_division=0
    )
    cm = confusion_matrix(y_test_true, y_test_pred, labels=[0, 1]).tolist()

    # Identify failure cases
    failure_cases = []
    for path, true_idx, pred_idx, prob in zip(test_paths, y_test_true, y_test_pred, y_test_probs):
        if true_idx != pred_idx:
            failure_cases.append({
                "file": os.path.basename(path),
                "true_label": IDX_TO_CLASS[true_idx],
                "predicted_label": IDX_TO_CLASS[pred_idx],
                "clean_probability": round(float(prob[0]), 4),
                "soiled_probability": round(float(prob[1]), 4)
            })

    logger.info("=== Final Evaluation on Held-Out Test Set ===")
    logger.info(f"Test Accuracy: {test_acc:.4f} ({test_acc*100:.1f}%)")
    logger.info(f"Macro-F1: {macro_f1:.4f} | Precision: {macro_prec:.4f} | Recall: {macro_rec:.4f}")
    logger.info(f"Clean Class  -> Prec: {prec_per_class[0]:.4f}, Recall: {rec_per_class[0]:.4f}, F1: {f1_per_class[0]:.4f}")
    logger.info(f"Soiled Class -> Prec: {prec_per_class[1]:.4f}, Recall: {rec_per_class[1]:.4f}, F1: {f1_per_class[1]:.4f}")
    logger.info(f"Confusion Matrix [[TN, FP], [FN, TP]]: {cm}")
    logger.info(f"Identified {len(failure_cases)} failure cases out of {len(test_samples)} test samples.")

    # Save trained PyTorch model artifact
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)
    model_artifact_path = os.path.join(ARTIFACTS_DIR, "panel_mobilenet_v3.pt")
    torch.save(best_state_dict, model_artifact_path)
    logger.info(f"Saved PyTorch weights to {model_artifact_path}")

    # Save metadata
    metadata = {
        "model_name": "RoofShift Photovoltaic Surface Inspection Classifier",
        "model_version": "1.0.0",
        "model_architecture": "MobileNetV3_Small",
        "parameters_count": sum(p.numel() for p in model.parameters()),
        "weights_artifact_file": "panel_mobilenet_v3.pt",
        "training_timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "task": "Binary Visual Surface Classification (Clean Module vs Visibly Soiled/Dusty Module)",
        "classes": CLASSES,
        "abstain_confidence_threshold": 0.65,
        "dataset_provenance": {
            "name": "Solar-Panel-Fault-Detection RGB Inspection Dataset",
            "repository": "https://github.com/djdhairya/Solar-Panel-Fault-Detection",
            "license": "MIT License (Copyright 2024 Dhairya Hindoriya)",
            "image_modality": "Standard RGB Digital Camera Photography (Visible Spectrum)",
            "total_images": len(train_samples) + len(val_samples) + len(test_samples),
            "class_distribution": {
                "clean": n_clean,
                "soiled": n_soiled
            }
        },
        "split_configuration": {
            "train_samples": len(train_samples),
            "val_samples": len(val_samples),
            "test_samples": len(test_samples),
            "split_ratio": "70% Train / 15% Validation / 15% Held-out Test (Stratified)"
        },
        "training_hyperparameters": {
            "epochs_trained": epoch,
            "batch_size": 16,
            "optimizer": "AdamW",
            "learning_rate": 5e-4,
            "weight_decay": 1e-4,
            "input_resolution": "224x224x3",
            "normalization_mean": [0.485, 0.456, 0.406],
            "normalization_std": [0.229, 0.224, 0.225]
        },
        "evaluation_on_held_out_test_set": {
            "accuracy": round(test_acc, 4),
            "macro_f1": round(macro_f1, 4),
            "macro_precision": round(macro_prec, 4),
            "macro_recall": round(macro_rec, 4),
            "per_class_metrics": {
                "CLEAN": {
                    "precision": round(prec_per_class[0], 4),
                    "recall": round(rec_per_class[0], 4),
                    "f1_score": round(f1_per_class[0], 4)
                },
                "SOILED": {
                    "precision": round(prec_per_class[1], 4),
                    "recall": round(rec_per_class[1], 4),
                    "f1_score": round(f1_per_class[1], 4)
                }
            },
            "confusion_matrix": {
                "true_clean_pred_clean": cm[0][0],
                "true_clean_pred_soiled": cm[0][1],
                "true_soiled_pred_clean": cm[1][0],
                "true_soiled_pred_soiled": cm[1][1]
            },
            "failure_cases": failure_cases
        },
        "scientific_limitations_and_disclaimer": (
            "This model operates on standard visible RGB imagery and detects surface dirt, dust, and soiling. "
            "It DOES NOT detect sub-surface cell micro-cracks, PID (Potential-Induced Degradation), "
            "or internal diode short-circuits, which require thermal infrared (IR) or electroluminescence (EL) testing."
        )
    }

    metadata_path = os.path.join(ARTIFACTS_DIR, "panel_classifier_metadata.json")
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    logger.info(f"Model metadata written to {metadata_path}")
    return metadata


if __name__ == "__main__":
    train_and_evaluate()
