import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
    PanelBody,
    RangeControl,
    ToggleControl,
    SelectControl,
    Button
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useEffect, useRef } from '@wordpress/element';
import PrismCanvas from './prism-canvas';

export default function Edit({ attributes, setAttributes }) {
    const blockProps = useBlockProps();
    const canvasRef = useRef(null);
    const prismInstance = useRef(null);

    const {
        prismSize, prismX, prismY, fadeBorder, grain,
        refractionIndex, dispersion, rainbowAngle, beamWidth,
        beamExitMinY, beamExitMaxY, beamEntryMinY, beamEntryMaxY,
        innerBeamAngle, bandCount, rainbowSpread,
        dampingEnabled, dampingFactor,
        boxedMode, boxWidth, boxHeight,
        targetFPS, antiAliasing, showFPS,
        domRainbowShapes
    } = attributes;

    useEffect(() => {
        if (canvasRef.current && !prismInstance.current) {
            prismInstance.current = new PrismCanvas(canvasRef.current, attributes);
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
            prismInstance.current.updateConfig(attributes);
        }
    }, [attributes]);

    const resetToDefaults = () => {
        setAttributes({
            prismSize: 200, prismX: 50, prismY: 50, fadeBorder: 25, grain: 0.15,
            refractionIndex: 1.44, dispersion: 0.11, rainbowAngle: 48, beamWidth: 13,
            beamExitMinY: 0, beamExitMaxY: 100, beamEntryMinY: 0, beamEntryMaxY: 100,
            innerBeamAngle: -78, bandCount: 7, rainbowSpread: 2.0,
            dampingEnabled: true, dampingFactor: 0.30,
            boxedMode: false, boxWidth: 900, boxHeight: 600,
            targetFPS: 60, antiAliasing: true, showFPS: false,
            domRainbowShapes: false
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
                </PanelBody>

                <PanelBody title={__('Interaction Settings', 'pinkfloyd-block')} initialOpen={false}>
                    <ToggleControl label={__('Enable Damping', 'pinkfloyd-block')} checked={dampingEnabled} onChange={(v) => setAttributes({ dampingEnabled: v })} />
                    <RangeControl label={__('Damping Factor', 'pinkfloyd-block')} value={dampingFactor} onChange={(v) => setAttributes({ dampingFactor: v })} min={0.01} max={0.3} step={0.01} />
                </PanelBody>

                <PanelBody title={__('Display Settings', 'pinkfloyd-block')} initialOpen={false}>
                    <ToggleControl label={__('Boxed Mode', 'pinkfloyd-block')} checked={boxedMode} onChange={(v) => setAttributes({ boxedMode: v })} />
                    {boxedMode && (
                        <>
                            <RangeControl label={__('Box Width', 'pinkfloyd-block')} value={boxWidth} onChange={(v) => setAttributes({ boxWidth: v })} min={400} max={1920} />
                            <RangeControl label={__('Box Height', 'pinkfloyd-block')} value={boxHeight} onChange={(v) => setAttributes({ boxHeight: v })} min={300} max={1080} />
                            <ToggleControl label={__('DOM Rainbow Shapes', 'pinkfloyd-block')} checked={domRainbowShapes} onChange={(v) => setAttributes({ domRainbowShapes: v })} help={__('Extend rainbow beyond canvas edges', 'pinkfloyd-block')} />
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

            <div className={`floyd-prism-container ${boxedMode ? 'is-boxed' : 'is-fullwidth'}`}>
                <canvas ref={canvasRef} className="prism-canvas" id="prism-canvas"></canvas>
                <div className="dom-rainbow-container"></div>
                {showFPS && <div className="fps-counter visible">{prismInstance.current?.fpsCounter.fps || 0} FPS</div>}
            </div>
        </div>
    );
}
