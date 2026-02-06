import PrismCanvas from './prism-canvas';

window.addEventListener('DOMContentLoaded', () => {
    const containers = document.querySelectorAll('.floyd-prism-block-frontend');

    containers.forEach(container => {
        const canvas = container.querySelector('.prism-canvas');
        const attributesData = container.getAttribute('data-attributes');

        if (canvas && attributesData) {
            try {
                const attributes = JSON.parse(attributesData);
                const prism = new PrismCanvas(canvas, attributes);

                // Expose instance for potential external control
                container.prismInstance = prism;
            } catch (e) {
                console.error('Failed to initialize Floyd Prism Canvas:', e);
            }
        }
    });
});
