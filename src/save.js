import { useBlockProps } from '@wordpress/block-editor';

export default function save({ attributes }) {
    const { boxedMode } = attributes;

    return (
        <div {...useBlockProps.save({
            className: `floyd-prism-block-frontend ${boxedMode ? 'is-boxed' : 'is-fullwidth'}`,
            'data-attributes': JSON.stringify(attributes)
        })}>
            <canvas className="prism-canvas"></canvas>
            <div className="dom-rainbow-container"></div>
            {attributes.showFPS && <div className="fps-counter">60 FPS</div>}
        </div>
    );
}
