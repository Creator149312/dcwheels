import { useEffect, useState } from 'react';

function ImageUploadAsSegment({ html }) {
    const [imageSrc, setImageSrc] = useState(null);

    const handleImageUpload = (event) => {
        const file = event.target.files[0];

        if (file) {
            const reader = new FileReader();

            reader.onload = (event) => {
                setImageSrc(event.target.result);
            };

            reader.readAsDataURL(file);
        }
    };

    useEffect(() => {
        if (imageSrc !== null) {
            const newHtml = html.current + `\n<div><img src="${imageSrc}"></div>`;
            html.current = newHtml;
            // console.log("Loaded Image = ", imageSrc);
            // console.log("Updated HTML", html.current);
        }
    }, [imageSrc]);

    return (
        <div>
            <input type="file" onChange={handleImageUpload} />
        </div>
    );
}

export default ImageUploadAsSegment;