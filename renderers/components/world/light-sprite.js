function LightSprite(lightID,lightTable) {
    let currentLightID = lightID - 1;
    this.setLightID = lightID => {
        currentLightID = lightID - 1;
    }
    Object.defineProperty(this,"lightID",{get:function(){
        return currentLightID;
    }});

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
        
        lightTable[currentLightID].render(destinationX,destinationY);
    }  
}
export default LightSprite;
