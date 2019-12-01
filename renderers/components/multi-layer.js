function MultiLayer() {
    let layers = [];
    let layerSize;
    let layersLookup = {};
    let nextID = 0;
    const cacheLayers = () => {
        layers = Object.values(layersLookup);
        layerSize = layers.length;
    }
    this.addLayer = layer => {
        let ID = nextID++;
        layer.terminate = this.removeLayer.bind(this,ID);
        layersLookup[ID] = layer;
        cacheLayers();
        return ID;
    }
    this.removeLayer = ID => {
        if(ID in layersLookup) {
            delete layersLookup[ID];
            cacheLayers();
            return true;
        } else {
            return false;
        }
    }
    this.clearLayers = () => {
        const IDs = Object.keys(layersLookup);
        IDs.forEach(ID => delete layersLookup[ID]);
        layers.splice(0);
        layerSize = 0;
    }
    this.render = (timestamp,...parameters) => {
        for(let i = 0;i<layerSize;i++) {
            const layer = layers[i];
            layer.render.call(layer,timestamp,...parameters);
        }
    }
}
export default MultiLayer;
