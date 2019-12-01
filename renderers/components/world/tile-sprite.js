function TileSprite(tileID) {
    let textureX = 0;
    let textureY = 0;
    let currentTileID = tileID;
    const setTextureCoordinates = () => {
        textureX = currentTileID % WorldTextureColumns * WorldTextureSize;
        textureY = Math.floor(currentTileID / WorldTextureColumns) * WorldTextureSize;
    }
    this.setTileID = tileID => {
        currentTileID = tileID;
        setTextureCoordinates();
    }
    setTextureCoordinates();
    Object.defineProperty(this,"tileID",{get:function(){
        return currentTileID;
    }});

    const tileset = imageDictionary["world-tileset"];

    this.x = 0;
    this.y = 0;
    this.xOffset = 0;
    this.yOffset = 0;

    this.tilesPerSecond = 1;

    Object.defineProperty(this,"location",{get:function(){
        return [this.x,this.y,this.xOffset,this.yOffset];
    }});

    this.skipRenderLogic = true;
    this.render = (timestamp,x,y,width,height) => {
        const startX = this.x;
        const startY = this.y;

        if(this.skipRenderLogic) {
            this.skipRenderLogic = false;
        } else if(this.renderLogic) {
            this.renderLogic(timestamp);
        }

        if(this.hidden) {
            return;
        }
        const destinationX = this.xOffset * width + x + (this.x - startX) * width;
        const destinationY = this.yOffset * height + y + (this.y - startY) * height;
        context.drawImage(
            tileset,textureX,textureY,WorldTextureSize,WorldTextureSize,destinationX,destinationY,width,height
        );
    }  
}
export default TileSprite;
