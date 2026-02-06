import { Modal, TextControl, Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useState, useEffect } from '@wordpress/element';

const ALBUM_COLORS = ['#ff0000', '#ff7700', '#ffdd00', '#00cc00', '#0066ff', '#7700dd'];

function interpolateColor(color1, color2, t) {
    const parse = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
    const [r1, g1, b1] = parse(color1);
    const [r2, g2, b2] = parse(color2);
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return `rgb(${r}, ${g}, ${b})`;
}

function getBandColor(index, bandCount) {
    const t = (index + 0.5) / bandCount;
    const colorIndex = t * (ALBUM_COLORS.length - 1);
    const floor = Math.floor(colorIndex);
    const ceil = Math.min(Math.ceil(colorIndex), ALBUM_COLORS.length - 1);
    return interpolateColor(ALBUM_COLORS[floor], ALBUM_COLORS[ceil], colorIndex % 1);
}

export default function BandLabelModal({ isOpen, onClose, bandCount, bandLabels, onSave }) {
    const [labels, setLabels] = useState([]);

    useEffect(() => {
        if (isOpen) {
            const initial = [];
            for (let i = 0; i < bandCount; i++) {
                initial.push({
                    text: bandLabels[i]?.text || '',
                    url: bandLabels[i]?.url || ''
                });
            }
            setLabels(initial);
        }
    }, [isOpen, bandCount]);

    if (!isOpen) return null;

    const updateLabel = (index, field, value) => {
        const newLabels = [...labels];
        newLabels[index] = { ...newLabels[index], [field]: value };
        setLabels(newLabels);
    };

    return (
        <Modal
            title={__('Band Labels', 'pinkfloyd-block')}
            onRequestClose={onClose}
            className="band-label-modal"
        >
            <div className="band-label-rows">
                {labels.map((label, i) => (
                    <div key={i} className="band-label-row">
                        <div
                            className="band-color-preview"
                            style={{
                                backgroundColor: getBandColor(i, bandCount),
                                width: 24,
                                height: 24,
                                borderRadius: 4,
                                flexShrink: 0
                            }}
                        />
                        <TextControl
                            label={`Band ${i + 1}`}
                            value={label.text}
                            onChange={(v) => updateLabel(i, 'text', v)}
                            placeholder={__('Label text...', 'pinkfloyd-block')}
                        />
                        <TextControl
                            label={__('URL', 'pinkfloyd-block')}
                            value={label.url}
                            onChange={(v) => updateLabel(i, 'url', v)}
                            placeholder="https://..."
                            type="url"
                        />
                    </div>
                ))}
            </div>
            <div className="band-label-modal-actions">
                <Button variant="secondary" onClick={onClose}>
                    {__('Cancel', 'pinkfloyd-block')}
                </Button>
                <Button variant="primary" onClick={() => { onSave(labels); onClose(); }}>
                    {__('Save Labels', 'pinkfloyd-block')}
                </Button>
            </div>
        </Modal>
    );
}
