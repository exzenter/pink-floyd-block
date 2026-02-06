import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';

export default function save({ attributes }) {
    const { boxedMode, boxBorderRadius, boxShadowEnabled, bgColor } = attributes;

    const containerStyle = {
        backgroundColor: bgColor || '#0a0a0c',
        ...(boxedMode ? {
            borderRadius: `${boxBorderRadius || 12}px`,
            boxShadow: boxShadowEnabled !== false
                ? '0 0 0 1px rgba(255, 255, 255, 0.05), 0 25px 50px -12px rgba(0, 0, 0, 0.8)'
                : 'none'
        } : {}),
    };

    return (
        <div {...useBlockProps.save({
            className: `floyd-prism-block-frontend ${boxedMode ? 'is-boxed' : 'is-fullwidth'}`,
            'data-attributes': JSON.stringify(attributes),
            style: containerStyle
        })}>
            <canvas className="prism-canvas"></canvas>
            <div className="dom-rainbow-container"></div>
            <div className="floyd-prism-inner-content">
                <InnerBlocks.Content />
            </div>
            {attributes.showFPS && <div className="fps-counter">60 FPS</div>}
        </div>
    );
}
