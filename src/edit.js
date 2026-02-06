import { useBlockProps, InspectorControls, InnerBlocks, useInnerBlocksProps } from '@wordpress/block-editor';
import {
    PanelBody,
    RangeControl,
    ToggleControl,
    SelectControl,
    Button,
    Dropdown,
    ColorPicker
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useEffect, useRef, useState } from '@wordpress/element';
import PrismCanvas from './prism-canvas';
import BandLabelModal from './band-label-modal';

const ColorSetting = ({ label, color, onChange }) => (
    <Dropdown
        popoverProps={{ placement: 'left-start', offset: 36 }}
        renderToggle={({ isOpen, onToggle }) => (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                <span style={{ fontSize: '12px' }}>{label}</span>
                <button
                    onClick={onToggle}
                    aria-expanded={isOpen}
                    aria-label={`${label} color`}
                    style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        border: '1px solid rgba(0, 0, 0, 0.2)',
                        background: color || 'transparent',
                        cursor: 'pointer',
                        padding: 0,
                        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)',
                    }}
                />
            </div>
        )}
        renderContent={() => (
            <ColorPicker
                color={color}
                onChange={onChange}
                enableAlpha
            />
        )}
    />
);

export default function Edit({ attributes, setAttributes }) {
    const blockProps = useBlockProps();
    const canvasRef = useRef(null);
    const prismInstance = useRef(null);
    const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);

    const {
        prismSize, prismX, prismY, fadeBorder, grain,
        refractionIndex, dispersion, rainbowAngle, beamWidth,
        beamExitMinY, beamExitMaxY, beamEntryMinY, beamEntryMaxY,
        innerBeamAngle, bandCount, rainbowSpread,
        dampingEnabled, dampingFactor,
        boxedMode, aspectRatioEnabled, aspectRatio,
        boxWidth, boxWidthUnit, boxHeight, boxHeightUnit,
        minCanvasSize, boxBorderRadius, boxShadowEnabled,
        targetFPS, antiAliasing, showFPS,
        domRainbowShapes, hideCanvasRainbow, domRainbowOpacity,
        prismColor, prismBorderColor, grainColor, bgColor, beamColor,
        hoverExpandEnabled, bandLabels
    } = attributes;

    useEffect(() => {
        if (canvasRef.current && !prismInstance.current) {
            // Disable DOM rainbow shapes in editor preview
            const editorConfig = { ...attributes, domRainbowShapes: false };
            prismInstance.current = new PrismCanvas(canvasRef.current, editorConfig);
        }
        return () => {
            if (prismInstance.current) {
                prismInstance.current.stop();
                prismInstance.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (prismInstance.current) {
            // Disable DOM rainbow shapes in editor preview
            const editorConfig = { ...attributes, domRainbowShapes: false };
            prismInstance.current.updateConfig(editorConfig);
        }
    }, [attributes]);

    const resetToDefaults = () => {
        setAttributes({
            prismSize: 200, prismX: 50, prismY: 50, fadeBorder: 25, grain: 0.15,
            refractionIndex: 1.44, dispersion: 0.11, rainbowAngle: 48, beamWidth: 13,
            beamExitMinY: 0, beamExitMaxY: 100, beamEntryMinY: 0, beamEntryMaxY: 100,
            innerBeamAngle: -78, bandCount: 7, rainbowSpread: 2.0,
            dampingEnabled: true, dampingFactor: 0.30,
            boxedMode: false, aspectRatioEnabled: false, aspectRatio: '16:9',
            boxWidth: 900, boxWidthUnit: 'px', boxHeight: 600, boxHeightUnit: 'px',
            targetFPS: 60, antiAliasing: true, showFPS: false,
            domRainbowShapes: false,
            hoverExpandEnabled: false,
            bandLabels: [],
            prismColor: 'rgba(25, 25, 35, 0.95)',
            prismBorderColor: 'rgba(255, 255, 255, 0.08)',
            grainColor: '#ffffff',
            bgColor: '#0a0a0c',
            beamColor: '#ffffff',
        });
    };

    return (
        <div {...blockProps}>
            <InspectorControls>
                <PanelBody title={__('Prism Settings', 'pinkfloyd-block')}>
                    <RangeControl label={__('Size', 'pinkfloyd-block')} value={prismSize} onChange={(v) => setAttributes({ prismSize: v })} min={80} max={400} />
                    <RangeControl label={__('Position X (%)', 'pinkfloyd-block')} value={prismX} onChange={(v) => setAttributes({ prismX: v })} min={20} max={80} />
                    <RangeControl label={__('Position Y (%)', 'pinkfloyd-block')} value={prismY} onChange={(v) => setAttributes({ prismY: v })} min={20} max={80} />
                    <RangeControl label={__('Fade Border', 'pinkfloyd-block')} value={fadeBorder} onChange={(v) => setAttributes({ fadeBorder: v })} min={0} max={60} />
                    <RangeControl label={__('Grain', 'pinkfloyd-block')} value={grain} onChange={(v) => setAttributes({ grain: v })} min={0} max={0.5} step={0.01} />
                </PanelBody>

                <PanelBody title={__('Beam Settings', 'pinkfloyd-block')} initialOpen={false}>
                    <RangeControl label={__('Refraction Index', 'pinkfloyd-block')} value={refractionIndex} onChange={(v) => setAttributes({ refractionIndex: v })} min={-2} max={5} step={0.01} />
                    <RangeControl label={__('Dispersion', 'pinkfloyd-block')} value={dispersion} onChange={(v) => setAttributes({ dispersion: v })} min={0} max={0.75} step={0.01} />
                    <RangeControl label={__('Rainbow Angle', 'pinkfloyd-block')} value={rainbowAngle} onChange={(v) => setAttributes({ rainbowAngle: v })} min={-180} max={180} />
                    <RangeControl label={__('Beam Width', 'pinkfloyd-block')} value={beamWidth} onChange={(v) => setAttributes({ beamWidth: v })} min={2} max={20} />
                    <RangeControl label={__('Beam Exit Min Y (%)', 'pinkfloyd-block')} value={beamExitMinY} onChange={(v) => setAttributes({ beamExitMinY: v })} min={0} max={100} />
                    <RangeControl label={__('Beam Exit Max Y (%)', 'pinkfloyd-block')} value={beamExitMaxY} onChange={(v) => setAttributes({ beamExitMaxY: v })} min={0} max={100} />
                    <RangeControl label={__('Prism Entry Min Y (%)', 'pinkfloyd-block')} value={beamEntryMinY} onChange={(v) => setAttributes({ beamEntryMinY: v })} min={0} max={100} />
                    <RangeControl label={__('Prism Entry Max Y (%)', 'pinkfloyd-block')} value={beamEntryMaxY} onChange={(v) => setAttributes({ beamEntryMaxY: v })} min={0} max={100} />
                    <RangeControl label={__('Inner Beam Angle', 'pinkfloyd-block')} value={innerBeamAngle} onChange={(v) => setAttributes({ innerBeamAngle: v })} min={-180} max={180} />
                </PanelBody>

                <PanelBody title={__('Rainbow Settings', 'pinkfloyd-block')} initialOpen={false}>
                    <RangeControl label={__('Band Count', 'pinkfloyd-block')} value={bandCount} onChange={(v) => setAttributes({ bandCount: v })} min={3} max={12} />
                    <RangeControl label={__('Rainbow Spread', 'pinkfloyd-block')} value={rainbowSpread} onChange={(v) => setAttributes({ rainbowSpread: v })} min={1} max={5} step={0.1} />
                    <ToggleControl
                        label={__('Hover Expand', 'pinkfloyd-block')}
                        checked={hoverExpandEnabled}
                        onChange={(v) => setAttributes({ hoverExpandEnabled: v })}
                        help={__('Bands expand on hover (right edge exit only)', 'pinkfloyd-block')}
                    />
                    <Button
                        variant="secondary"
                        onClick={() => setIsLabelModalOpen(true)}
                        style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}
                    >
                        {__('Edit Band Labels', 'pinkfloyd-block')}
                    </Button>
                </PanelBody>

                <PanelBody title={__('Color Settings', 'pinkfloyd-block')} initialOpen={false}>
                    <ColorSetting label={__('Background', 'pinkfloyd-block')} color={bgColor} onChange={(v) => setAttributes({ bgColor: v })} />
                    <ColorSetting label={__('Prism', 'pinkfloyd-block')} color={prismColor} onChange={(v) => setAttributes({ prismColor: v })} />
                    <ColorSetting label={__('Prism Border', 'pinkfloyd-block')} color={prismBorderColor} onChange={(v) => setAttributes({ prismBorderColor: v })} />
                    <ColorSetting label={__('Beam', 'pinkfloyd-block')} color={beamColor} onChange={(v) => setAttributes({ beamColor: v })} />
                    <ColorSetting label={__('Grain', 'pinkfloyd-block')} color={grainColor} onChange={(v) => setAttributes({ grainColor: v })} />
                </PanelBody>

                <PanelBody title={__('Interaction Settings', 'pinkfloyd-block')} initialOpen={false}>
                    <ToggleControl label={__('Enable Damping', 'pinkfloyd-block')} checked={dampingEnabled} onChange={(v) => setAttributes({ dampingEnabled: v })} />
                    <RangeControl label={__('Damping Factor', 'pinkfloyd-block')} value={dampingFactor} onChange={(v) => setAttributes({ dampingFactor: v })} min={0.01} max={0.3} step={0.01} />
                </PanelBody>

                <PanelBody title={__('Display Settings', 'pinkfloyd-block')} initialOpen={false}>
                    <ToggleControl label={__('Boxed Mode', 'pinkfloyd-block')} checked={boxedMode} onChange={(v) => setAttributes({ boxedMode: v })} />
                    {boxedMode && (
                        <>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '16px' }}>
                                <div style={{ flex: 1 }}>
                                    <RangeControl
                                        label={__('Box Width', 'pinkfloyd-block')}
                                        value={boxWidth}
                                        onChange={(v) => setAttributes({ boxWidth: v })}
                                        min={boxWidthUnit === 'px' ? 200 : 10}
                                        max={boxWidthUnit === 'px' ? 1920 : 100}
                                    />
                                </div>
                                <SelectControl
                                    value={boxWidthUnit}
                                    options={[
                                        { label: 'px', value: 'px' },
                                        { label: 'rem', value: 'rem' },
                                        { label: 'vw', value: 'vw' },
                                        { label: '%', value: '%' }
                                    ]}
                                    onChange={(v) => setAttributes({ boxWidthUnit: v })}
                                    style={{ marginBottom: '8px' }}
                                />
                            </div>
                            <ToggleControl
                                label={__('Lock Aspect Ratio', 'pinkfloyd-block')}
                                checked={aspectRatioEnabled}
                                onChange={(v) => setAttributes({ aspectRatioEnabled: v })}
                            />
                            {aspectRatioEnabled ? (
                                <SelectControl
                                    label={__('Aspect Ratio', 'pinkfloyd-block')}
                                    value={aspectRatio}
                                    options={[
                                        { label: '16:9', value: '16:9' },
                                        { label: '4:3', value: '4:3' },
                                        { label: '21:9', value: '21:9' },
                                        { label: '1:1', value: '1:1' },
                                        { label: '3:2', value: '3:2' },
                                        { label: '2:1', value: '2:1' }
                                    ]}
                                    onChange={(v) => setAttributes({ aspectRatio: v })}
                                />
                            ) : (
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '16px' }}>
                                    <div style={{ flex: 1 }}>
                                        <RangeControl
                                            label={__('Box Height', 'pinkfloyd-block')}
                                            value={boxHeight}
                                            onChange={(v) => setAttributes({ boxHeight: v })}
                                            min={boxHeightUnit === 'px' ? 150 : 10}
                                            max={boxHeightUnit === 'px' ? 1080 : 100}
                                        />
                                    </div>
                                    <SelectControl
                                        value={boxHeightUnit}
                                        options={[
                                            { label: 'px', value: 'px' },
                                            { label: 'rem', value: 'rem' },
                                            { label: 'vh', value: 'vh' },
                                            { label: '%', value: '%' }
                                        ]}
                                        onChange={(v) => setAttributes({ boxHeightUnit: v })}
                                        style={{ marginBottom: '8px' }}
                                    />
                                </div>
                            )}
                            <ToggleControl label={__('DOM Rainbow Shapes', 'pinkfloyd-block')} checked={domRainbowShapes} onChange={(v) => setAttributes({ domRainbowShapes: v })} help={__('Extend rainbow beyond canvas edges', 'pinkfloyd-block')} />
                            {domRainbowShapes && (
                                <>
                                    <ToggleControl
                                        label={__('Hide Canvas Rainbow', 'pinkfloyd-block')}
                                        checked={hideCanvasRainbow}
                                        onChange={(v) => setAttributes({ hideCanvasRainbow: v })}
                                        help={__('Only show DOM rainbow shapes', 'pinkfloyd-block')}
                                    />
                                    <RangeControl
                                        label={__('DOM Rainbow Opacity', 'pinkfloyd-block')}
                                        value={domRainbowOpacity}
                                        onChange={(v) => setAttributes({ domRainbowOpacity: v })}
                                        min={0}
                                        max={1}
                                        step={0.05}
                                    />
                                </>
                            )}
                            <RangeControl
                                label={__('Min Canvas Size (px)', 'pinkfloyd-block')}
                                value={minCanvasSize}
                                onChange={(v) => setAttributes({ minCanvasSize: v })}
                                min={50}
                                max={500}
                            />
                            <RangeControl
                                label={__('Border Radius (px)', 'pinkfloyd-block')}
                                value={boxBorderRadius}
                                onChange={(v) => setAttributes({ boxBorderRadius: v })}
                                min={0}
                                max={50}
                            />
                            <ToggleControl
                                label={__('Box Shadow', 'pinkfloyd-block')}
                                checked={boxShadowEnabled}
                                onChange={(v) => setAttributes({ boxShadowEnabled: v })}
                            />
                        </>
                    )}
                </PanelBody>

                <PanelBody title={__('Performance Settings', 'pinkfloyd-block')} initialOpen={false}>
                    <SelectControl
                        label={__('Target FPS', 'pinkfloyd-block')}
                        value={targetFPS}
                        options={[
                            { label: '30 FPS', value: 30 },
                            { label: '60 FPS', value: 60 }
                        ]}
                        onChange={(v) => setAttributes({ targetFPS: parseInt(v) })}
                    />
                    <ToggleControl label={__('Anti-Aliasing', 'pinkfloyd-block')} checked={antiAliasing} onChange={(v) => setAttributes({ antiAliasing: v })} />
                    <ToggleControl label={__('Show FPS', 'pinkfloyd-block')} checked={showFPS} onChange={(v) => setAttributes({ showFPS: v })} />
                </PanelBody>

                <PanelBody>
                    <Button isDestructive onClick={resetToDefaults} style={{ width: '100%', justifyContent: 'center' }}>
                        {__('Reset to Defaults', 'pinkfloyd-block')}
                    </Button>
                </PanelBody>
            </InspectorControls>

            <div
                className={`floyd-prism-container ${boxedMode ? 'is-boxed' : 'is-fullwidth'}`}
                style={boxedMode ? {
                    width: `${boxWidth}${boxWidthUnit}`,
                    backgroundColor: bgColor || '#0a0a0c',
                    borderRadius: `${boxBorderRadius}px`,
                    boxShadow: boxShadowEnabled
                        ? '0 0 0 1px rgba(255, 255, 255, 0.05), 0 25px 50px -12px rgba(0, 0, 0, 0.8)'
                        : 'none'
                } : {
                    backgroundColor: bgColor || '#0a0a0c',
                }}
            >
                <canvas ref={canvasRef} className="prism-canvas" id="prism-canvas"></canvas>
                <div className="dom-rainbow-container"></div>
                <div className="floyd-prism-inner-content">
                    <InnerBlocks
                        renderAppender={InnerBlocks.ButtonBlockAppender}
                    />
                </div>
                {showFPS && <div className="fps-counter visible">{prismInstance.current?.fpsCounter.fps || 0} FPS</div>}
            </div>
            <BandLabelModal
                isOpen={isLabelModalOpen}
                onClose={() => setIsLabelModalOpen(false)}
                bandCount={bandCount}
                bandLabels={bandLabels || []}
                onSave={(labels) => setAttributes({ bandLabels: labels })}
            />
        </div>
    );
}
