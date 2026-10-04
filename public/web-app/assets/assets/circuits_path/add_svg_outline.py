"""
add_svg_outline.py
-------------------
یک stroke جدید (outline) پشت stroke اصلی هر <path> اضافه می‌کنه، بدون اینکه
رنگ/ضخامت stroke اصلی (مثلاً مشکی) تغییر کنه. همه‌ی فایل‌های svg. توی همون
پوشه‌ای که اسکریپت اجرا میشه رو پردازش می‌کنه و خروجی رو با همون اسم فایل
داخل یک پوشه‌ی جدید (OUTPUT_DIR) می‌ریزه.

اجرا:
    python add_svg_outline.py
"""

import os
import re
import copy
import xml.etree.ElementTree as ET

# ---------------------- تنظیمات قابل تغییر ----------------------
INPUT_DIR = "."                    # پوشه‌ی ورودی (پیش‌فرض: همون پوشه‌ای که اسکریپت توشه)
OUTPUT_DIR = "svg_with_outline"    # پوشه‌ی خروجی، داخل همون پوشه ساخته میشه
OUTLINE_COLOR = "#ffffff"          # رنگ stroke جدید (outline)
OUTLINE_EXTRA = 3                  # این مقدار به هر طرفِ ضخامت stroke اصلی اضافه میشه
# ------------------------------------------------------------------

SVG_NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG_NS)  # جلوگیری از اضافه شدن پیشوند ns0: به خروجی


def split_number_unit(value: str):
    """از رشته‌ای مثل '2' یا '2px' عدد و واحد رو جدا می‌کنه."""
    match = re.match(r"^([0-9]*\.?[0-9]+)\s*(.*)$", value.strip())
    if not match:
        return None, ""
    return float(match.group(1)), match.group(2)


def add_outline_to_svg(input_path: str, output_path: str) -> int:
    """یک فایل svg رو پردازش می‌کنه. تعداد path هایی که outline گرفتن رو برمی‌گردونه."""
    tree = ET.parse(input_path)
    root = tree.getroot()

    # ElementTree خودش رابطه‌ی parent نداره، پس یک نگاشت فرزند -> والد می‌سازیم
    parent_map = {child: parent for parent in root.iter() for child in parent}

    path_tag = f"{{{SVG_NS}}}path"
    targets = [
        el for el in root.iter(path_tag)
        if el.get("stroke") not in (None, "none")
    ]

    for original in targets:
        stroke_width = original.get("stroke-width", "1")
        number, unit = split_number_unit(stroke_width)
        if number is None:
            continue

        new_width = number + OUTLINE_EXTRA * 2
        new_width_str = str(int(new_width)) if new_width.is_integer() else str(new_width)

        outline = copy.deepcopy(original)
        outline.set("stroke", OUTLINE_COLOR)
        outline.set("stroke-width", f"{new_width_str}{unit}")
        outline.attrib.pop("id", None)  # جلوگیری از id تکراری

        parent = parent_map[original]
        index = list(parent).index(original)
        parent.insert(index, outline)  # قبل از path اصلی => زیرش رندر میشه (outline پشت خط سیاه)

    tree.write(output_path, xml_declaration=True, encoding="UTF-8")
    return len(targets)


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    svg_files = [f for f in os.listdir(INPUT_DIR) if f.lower().endswith(".svg")]

    if not svg_files:
        print("هیچ فایل svg ای در این پوشه پیدا نشد.")
        return

    for filename in svg_files:
        input_path = os.path.join(INPUT_DIR, filename)
        output_path = os.path.join(OUTPUT_DIR, filename)
        count = add_outline_to_svg(input_path, output_path)
        print(f"✓ {filename} -> {OUTPUT_DIR}/{filename}  ({count} path)")


if __name__ == "__main__":
    main()
