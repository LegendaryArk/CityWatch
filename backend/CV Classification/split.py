import os
import shutil
from sklearn.model_selection import train_test_split


DATASET_DIR = '/home/noahsun/datasets'
CLASSES = [cls for cls in os.listdir(DATASET_DIR) if os.path.isdir(os.path.join(DATASET_DIR, cls))]
SPLITS = ['train', 'val', 'test']

for split in SPLITS:
    for cls in CLASSES:
        new_dir = os.path.join(DATASET_DIR, split, cls)
        os.makedirs(new_dir, exist_ok=True)

for cls in CLASSES:
    for split in SPLITS:
        old_dir = os.path.join(DATASET_DIR, cls, split)
        if not os.path.exists(old_dir):
            continue

        for file_name in os.listdir(old_dir):
            old_file = os.path.join(old_dir, file_name)
            new_file = os.path.join(os.path.join(DATASET_DIR, split, cls), file_name)
            shutil.move(old_file, new_file)

# DATA_DIR = '/home/noahsun/datasets/all_images'
# OUTPUT_DIR = '/home/noahsun/datasets'

# classes = ['potholes']

# for split in ['train', 'val', 'test']:
#     for cls in classes:
#         os.makedirs(os.path.join(OUTPUT_DIR, cls, split), exist_ok=True)

# for cls in classes:
#     images = os.listdir(os.path.join(DATA_DIR, cls))
#     train_val_imgs, test_imgs = train_test_split(images, test_size=0.15, random_state=42)
#     train_imgs, val_imgs = train_test_split(train_val_imgs, test_size=0.15, random_state=42)
#
#     for img in train_imgs:
#         shutil.copy(os.path.join(DATA_DIR, cls, img), os.path.join(OUTPUT_DIR, cls, 'train', img))
#     for img in val_imgs:
#         shutil.copy(os.path.join(DATA_DIR, cls, img), os.path.join(OUTPUT_DIR, cls, 'val', img))
#     for img in test_imgs:
#         shutil.copy(os.path.join(DATA_DIR, cls, img), os.path.join(OUTPUT_DIR, cls, 'test', img))