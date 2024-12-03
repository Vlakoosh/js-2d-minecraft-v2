//canvas setup
const canvas = document.getElementById("canvas");
canvas.width = 640;
canvas.height = 480;
const ctx = canvas.getContext("2d");
const body = document.querySelector("body");

//textures setup
const texture_image_path = "assets/textures/js-minecraft-v2.png"
const texture_image = new Image()
texture_image.src = texture_image_path

// config
const WORLD_HEIGHT = 20;
const WORLD_CHUNK_SIZE_X = 10;
const WORLD_CHUNK_SIZE_Y = 10;
const CHUNK_SIZE_X = 16;
const CHUNK_SIZE_Y = 16;

// global variables
let globalRotation = 0;
let cameraX = 0;
let cameraY = 0;


class Chunk {
    constructor(x, y) {
        this.chunkX = x;
        this.chunkY = y;
        this.data = this.makeChunk();
    }
    //generate a chunk of size specified in config variables
    makeChunk(){
        let chunkData = new Array(WORLD_HEIGHT)
        for (let level = 0; level < WORLD_HEIGHT; level++) {
            chunkData[level] = new Array(CHUNK_SIZE_X);
            for (let x = 0; x < CHUNK_SIZE_X; x++){
                chunkData[level][x] = new Array(CHUNK_SIZE_Y);
            }
        }
        return chunkData;
    }
}

class Block {
    constructor(x,y,z, blockId, blockRotation=0) {
        this.blockX = x;
        this.blockY = y;
        this.blockZ = z;
        this.blockId = blockId;
        this.blockRotation=blockRotation;
    }
}

//array of chunks
let world = new Array(WORLD_CHUNK_SIZE_X).fill(null).map(() => new Array(WORLD_CHUNK_SIZE_Y));

let buttonPressedUpArrow = false;
let buttonPressedDownArrow = false;
let buttonPressedLeftArrow = false;
let buttonPressedRightArrow = false;


window.onkeydown = (e) => {
    switch (e.key) {
        case "ArrowUp":
            buttonPressedUpArrow = true;
            break;
        case "ArrowDown":
            buttonPressedDownArrow = true;
            break;
        case "ArrowLeft":
            buttonPressedLeftArrow = true;
            break;
        case "ArrowRight":
            buttonPressedRightArrow = true;
            break;
        case "e":
            globalRotation += 90;
            break;
        case "q":
            if (globalRotation === 0) globalRotation = 360
            else globalRotation -= 90;
    }
}

window.onkeyup = (e) => {
    switch (e.key) {
        case "ArrowUp":
            buttonPressedUpArrow = false;
            break;
        case "ArrowDown":
            buttonPressedDownArrow = false;
            break;
        case "ArrowLeft":
            buttonPressedLeftArrow = false;
            break;
        case "ArrowRight":
            buttonPressedRightArrow = false;
            break;
    }
}

function parseInput() {
    if (buttonPressedUpArrow) {
        cameraY -= 5;
    }
    if (buttonPressedDownArrow) {
        cameraY += 5;
    }
    if (buttonPressedLeftArrow) {
        cameraX -= 5;
    }
    if (buttonPressedRightArrow) {
        cameraX += 5;
    }
}


function fillChunkSlice(chunk,x,y,totalHeight,dirtHeight){
    for (let level = 1; level < totalHeight; level++) {
        let blockId = 4;
        if (level < dirtHeight) blockId = 2;
        if (level === totalHeight - 1) blockId = 5; //grass on top layer
        chunk.data[level][x][y].blockId = blockId;
    }
}

function rotateCoordinates(x, y, angle) {
    const radians = (angle * Math.PI) / 180;
    const rotatedX = Math.round(x * Math.cos(radians) - y * Math.sin(radians));
    const rotatedY = Math.round(x * Math.sin(radians) + y * Math.cos(radians));
    return [rotatedX, rotatedY];
}

function buildZBuffer(world, rotationAngle) {
    let zBuffer = [];

    for (let chunkRow = 0; chunkRow < WORLD_CHUNK_SIZE_Y; chunkRow++) {
        for (let chunkCol = 0; chunkCol < WORLD_CHUNK_SIZE_X; chunkCol++) {
            let chunk = world[chunkRow][chunkCol];

            // console.log("Placing chunk at: " + world[chunkRow][chunkCol].chunkX + ", " + world[chunkRow][chunkCol].chunkY)

            for (let level = 0; level < WORLD_HEIGHT; level++) {
                for (let x = 0; x < CHUNK_SIZE_X; x++) {
                    for (let y = 0; y < CHUNK_SIZE_Y; y++) {
                        let block = chunk.data[level][x][y];
                        if (!block) continue; // Skip empty spaces
                        // Calculate global coordinates
                        let globalX = chunkRow * CHUNK_SIZE_X + x;
                        let globalY = chunkCol * CHUNK_SIZE_Y + y;
                        // Rotate coordinates
                        let [rotatedX, rotatedY] = rotateCoordinates(globalX, globalY, rotationAngle);
                        // Add to zBuffer
                        zBuffer.push({
                            block: block,
                            globalX: rotatedX,
                            globalY: rotatedY,
                            level: level,
                            z_index: level + rotatedY * 16 + rotatedX
                        });
                    }
                }
            }
        }
    }

    // Sort by z_index
    zBuffer.sort((a, b) => a.z_index - b.z_index);

    return zBuffer;
}

function drawScene(zBuffer, cameraX, cameraY) {
    for (let item of zBuffer) {
        const { block, globalX, globalY, level } = item;

        // Convert to screen coordinates
        let screenX = (globalX - cameraX) * 16;
        let screenY = (globalY - cameraY) * 16 - level * 16;

        // Draw the block
        switch (block.blockId) {
            case 1:
                ctx.drawImage(texture_image, 0, 0, 16, 32, screenX, screenY, 16, 32);
                break;
            case 2:
                ctx.drawImage(texture_image, 16, 0, 16, 32, screenX, screenY, 16, 32);
                break;
            case 4:
                ctx.drawImage(texture_image, 48, 0, 16, 32, screenX, screenY, 16, 32);
                break;
            case 5:
                ctx.drawImage(texture_image, 64, 0, 16, 32, screenX, screenY, 16, 32);
                break;
        }
    }
}

function render() {
    let zBuffer = buildZBuffer(world, globalRotation);
    drawScene(zBuffer, cameraX, cameraY);
}

function generateWorld(){
    perlin.seed()
    for (let chunkX = 0; chunkX < WORLD_CHUNK_SIZE_X; chunkX++) {
        for (let chunkY = 0; chunkY < WORLD_CHUNK_SIZE_Y; chunkY++) {
            //fill world with chunks filled with empty blocks
            let chunk = new Chunk(chunkX,chunkY);
            for (let blockLevel = 0; blockLevel < WORLD_HEIGHT; blockLevel++) {
                for (let blockX = 0; blockX < CHUNK_SIZE_X; blockX++) {
                    for (let blockY = 0; blockY < CHUNK_SIZE_Y; blockY++) {
                        //fill chunk with empty
                        chunk.data[blockLevel][blockX][blockY] = new Block(blockX,blockY,blockLevel, 0, 0);
                    }
                }
            }

            for (let blockX = 0; blockX < CHUNK_SIZE_X; blockX++) {
                for (let blockY = 0; blockY < WORLD_CHUNK_SIZE_Y; blockY++) {
                    //create bedrock layer
                    chunk.data[0][blockX][blockY].blockId = 1;

                    //fill chunk with stone and dirt
                    let perlinX = chunkX * CHUNK_SIZE_X + blockX;
                    let perlinY = chunkY * CHUNK_SIZE_Y + blockY;
                    let v = Math.floor(8 + perlin.get(perlinX / 10,perlinY / 10) * 5)
                    fillChunkSlice(chunk, blockX, blockY,v , 3)
                    //let v = 5+(perlin.get(x/10,y/10)+0.5) * 10;
                }
            }


            world[chunkX][chunkY] = chunk;

        }
    }
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    parseInput()
    render()
}




texture_image.onload = () => {
    generateWorld()
    console.log(world)
    // buildZBuffer(world, globalRotation)
    setInterval(gameLoop, 50);
}

