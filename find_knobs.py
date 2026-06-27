from PIL import Image

# Load screenshot
img = Image.open('/Users/chaitanyapareek/.gemini/antigravity-ide/brain/6cca26ac-1535-466e-927f-12cc855cc669/tv_off_initial_1782487197700.png')
print("Image size:", img.size)

# The CSS dial is rendered over the image. We just want to get a sense of where it is.
# Actually, it's easier to just guess-and-check if we had a browser.
# Without a browser, let's just make it a bit smaller and position it better.
# Looking at typical TVs, the volume knob is usually top-right on the control panel, power button is below.
