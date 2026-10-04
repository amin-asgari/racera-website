from pathlib import Path
from PIL import Image, ImageOps

# فولدری که فایل پایتون داخل آن قرار دارد
folder = Path(__file__).parent

# فرمت‌های قابل پردازش
image_extensions = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".webp"}

# ابعاد کراپ
crop_width = 543.5
crop_height = 220.5

# چون مختصات پیکسل باید عدد صحیح باشند
crop_width = round(crop_width)
crop_height = round(crop_height)

# پیدا کردن تمام عکس‌های فولدر
for image_path in folder.iterdir():

    # فقط فایل‌های تصویری
    if image_path.suffix.lower() not in image_extensions:
        continue

    # جلوگیری از پردازش مجدد فایل‌های خروجی
    if image_path.stem.endswith("_half"):
        continue

    try:
        # باز کردن عکس
        with Image.open(image_path) as image:

            # تبدیل به RGB در صورت نیاز
            if image.mode not in ("RGB", "RGBA"):
                image = image.convert("RGB")

            # Reflect افقی
            flipped_image = ImageOps.mirror(image)

            # کراپ از گوشه چپ بالا
            # (left, top, right, bottom)
            cropped_image = flipped_image.crop(
                (0, 0, crop_width, crop_height)
            )

            # ساخت نام فایل خروجی
            output_path = image_path.with_name(
                f"{image_path.stem}_half{image_path.suffix}"
            )

            # ذخیره در همان فولدر
            cropped_image.save(output_path)

            print(f"Done: {image_path.name} -> {output_path.name}")

    except Exception as e:
        print(f"Error processing {image_path.name}: {e}")

print("All images processed.")