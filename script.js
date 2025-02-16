const COMPRESSION_QUALITY = 0.8; // 80% quality
const MAX_WIDTH = 1024; // maximum width in pixels

const inputImage = document.getElementById('inputImage');
const selectImagesBtn = document.getElementById('selectImagesBtn');
const imageContainer = document.getElementById('image-container');
const preview = document.getElementById('preview');
const resetBtn = document.getElementById('resetBtn');
const submitBtn = document.getElementById('submitBtn');
let croppers = [];

// Cropper options
const cropperOptions = {
    viewMode: 2,
    autoCropArea: 1,
    cropBoxResizable: true,
    dragMode: 'move'
};

// Compression options
const compressionOptions = {
    maxSizeMB: 1,
    maxWidthOrHeight: MAX_WIDTH,
    useWebWorker: true,
    quality: COMPRESSION_QUALITY
};

// Compress image function
async function compressImage(imgBlob) {
    try {
        const compressedFile = await imageCompression(imgBlob, compressionOptions);
        return compressedFile;
    } catch (error) {
        console.error('Compression error:', error);
        return imgBlob; // Return original if compression fails
    }
}

// Convert canvas to blob
function canvasToBlob(canvas) {
    return new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', COMPRESSION_QUALITY);
    });
}

selectImagesBtn.addEventListener('click', () => inputImage.click());

inputImage.addEventListener('change', function (event) {
    const files = Array.from(event.target.files);

    files.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            const imageWrapper = document.createElement('div');
            imageWrapper.classList.add('image-wrapper');
            const img = document.createElement('img');
            img.src = e.target.result;
            img.alt = `Image ${index + 1}`;

            const cropBtn = document.createElement('button');
            cropBtn.textContent = "Crop";
            cropBtn.classList.add('cropBtn');

            const removeBtn = document.createElement('button');
            removeBtn.textContent = "❌";
            removeBtn.classList.add('removeBtn');

            imageWrapper.appendChild(img);
            imageWrapper.appendChild(cropBtn);
            imageWrapper.appendChild(removeBtn);
            imageContainer.appendChild(imageWrapper);

            const cropper = new Cropper(img, cropperOptions);
            croppers.push(cropper);

            let prevCroppedWrapper = null;

            cropBtn.addEventListener('click', async function () {
                const croppedCanvas = cropper.getCroppedCanvas();
                if (croppedCanvas) {
                    if (prevCroppedWrapper) {
                        preview.removeChild(prevCroppedWrapper);
                    }

                    // Compress the cropped image
                    const croppedBlob = await canvasToBlob(croppedCanvas);
                    const compressedBlob = await compressImage(croppedBlob);

                    const previewWrapper = document.createElement('div');
                    previewWrapper.classList.add('preview-wrapper');

                    const croppedImage = document.createElement('img');
                    croppedImage.src = URL.createObjectURL(compressedBlob);
                    croppedImage.classList.add('preview-img');

                    const removeCroppedBtn = document.createElement('button');
                    removeCroppedBtn.textContent = "❌";
                    removeCroppedBtn.classList.add('removeBtn');

                    removeCroppedBtn.addEventListener('click', function () {
                        preview.removeChild(previewWrapper);
                        prevCroppedWrapper = null;
                    });

                    previewWrapper.appendChild(croppedImage);
                    previewWrapper.appendChild(removeCroppedBtn);
                    preview.appendChild(previewWrapper);

                    prevCroppedWrapper = previewWrapper;
                }
            });

            removeBtn.addEventListener('click', function () {
                imageContainer.removeChild(imageWrapper);
                cropper.destroy();
                croppers = croppers.filter(c => c !== cropper);
            });
        };
        reader.readAsDataURL(file);
    });

    inputImage.value = '';
});

resetBtn.addEventListener('click', function () {
    inputImage.value = '';
    imageContainer.innerHTML = '';
    preview.innerHTML = '';
    croppers.forEach(cropper => cropper.destroy());
    croppers = [];
});

submitBtn.addEventListener('click', async function () {
    const formData = new FormData();
    const images = document.querySelectorAll('.preview-img');

    const uploadPromises = Array.from(images).map((img, index) => {
        return fetch(img.src)
            .then(res => res.blob())
            .then(blob => {
                formData.append(`image_${index}`, blob, `compressed_image_${index}.jpg`);
            });
    });

    Promise.all(uploadPromises).then(() => {
        fetch('/upload-images', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                alert('Images uploaded successfully!');
                console.log(data);
            })
            .catch(error => {
                console.error('Upload error:', error);
                alert('Failed to upload images.');
            });
    }).catch(error => {
        console.error('Error during image processing:', error);
        alert('Failed to process images.');
    });
});
