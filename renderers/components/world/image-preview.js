function ImagePreview(imageName,getArea) {
    let image = imageDictionary[imageName];
    if(!image) {
        image = imageDictionary[ERROR_IMAGE];
    }
    this.render = () => {
        let size;
        const area = getArea();
        if(area.width < area.height) {
            size = area.width;
        } else {
            size = area.height;
        }
        const halfSize = size / 2;
        area.x = Math.round(area.x+area.width/2-halfSize);
        area.y = Math.round(area.y+area.height/2-halfSize);

        context.drawImage(
            image,area.x,area.y,size,size
        );
    }
}
export default ImagePreview;
