from PIL import Image

def autocrop_image(image_path, output_path):
    image = Image.open(image_path)
    # Get bounding box of non-transparent pixels
    bbox = image.getbbox()
    if bbox:
        cropped_image = image.crop(bbox)
        # To make it a good favicon, we should make it a square
        # Let's get the new size
        width, height = cropped_image.size
        # Make a square background (transparent)
        max_dim = max(width, height)
        square_image = Image.new('RGBA', (max_dim, max_dim), (0, 0, 0, 0))
        # Paste the cropped image in the center
        offset = ((max_dim - width) // 2, (max_dim - height) // 2)
        square_image.paste(cropped_image, offset)
        square_image.save(output_path)
        print(f"Cropped and squared image saved to {output_path}")
    else:
        print("Image is entirely transparent.")

autocrop_image('public/tv-globe-logo.png', 'public/tv-globe-logo.png')
