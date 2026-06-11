from PIL import Image, ImageDraw
import os

if not os.path.exists('icons'):
    os.makedirs('icons')

def create_icon(size):
    # Create a black background with rounded corners
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw rounded rectangle
    radius = int(size * 0.2)
    # PIL doesn't have a direct rounded_rectangle that supports RGBA properly in older versions
    # We will just draw a normal rectangle for simplicity if rounded fails
    try:
        draw.rounded_rectangle([(0, 0), (size, size)], radius=radius, fill=(0, 0, 0, 255))
    except AttributeError:
        draw.rectangle([(0, 0), (size, size)], fill=(0, 0, 0, 255))
    
    # Draw play triangle in Douyin color (#fe2c55)
    triangle = [
        (int(size * 0.35), int(size * 0.25)),
        (int(size * 0.75), int(size * 0.5)),
        (int(size * 0.35), int(size * 0.75))
    ]
    draw.polygon(triangle, fill=(254, 44, 85, 255))
    
    img.save(f'icons/icon{size}.png')

try:
    create_icon(16)
    create_icon(48)
    create_icon(128)
    print("Icons generated successfully")
except Exception as e:
    print(f"Error generating icons: {e}")
