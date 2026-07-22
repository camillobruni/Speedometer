import L from "leaflet";
import { THEME_COLORS } from "../theme/colors.js";

const canvasPool = [];

export const TopographicTileLayer = L.GridLayer.extend({
    initialize: function (options) {
        L.GridLayer.prototype.initialize.call(this, options);
        this.on("tileunload", this._onTileUnload, this);
    },

    _onTileUnload: function (unloadEvent) {
        const tile = unloadEvent.tile;
        if (!tile || tile.nodeName !== "CANVAS") {
            throw new Error("Fatal: Tile unload targeted a non-canvas element.");
        }
        tile.width = 1;
        tile.height = 1;
        canvasPool.push(tile);
    },

    _getPooledCanvas: function (tileDimensions) {
        let canvas = canvasPool.pop();
        if (!canvas)
            canvas = document.createElement("canvas");

        canvas.width = tileDimensions.x;
        canvas.height = tileDimensions.y;
        return canvas;
    },

    createTile: function (tileCoordinates, done) {
        const tileDimensions = this.getTileSize();
        const canvas = this._getPooledCanvas(tileDimensions);
        const renderingContext = canvas.getContext("2d");
        if (!renderingContext) {
            throw new Error("Fatal: Failed to get 2d context for topographic tile canvas.");
        }

        this._renderTopography(renderingContext, tileCoordinates, tileDimensions.x, tileDimensions.y);

        done(null, canvas);
        return canvas;
    },

    _renderTopography: function (renderingContext, tileCoordinates, tileWidth, tileHeight) {
        renderingContext.fillStyle = THEME_COLORS.terrain;
        renderingContext.fillRect(0, 0, tileWidth, tileHeight);

        renderingContext.strokeStyle = "#242a38";
        renderingContext.lineWidth = 1;
        const gridStepSize = 64;
        renderingContext.beginPath();
        for (let x = gridStepSize; x < tileWidth; x += gridStepSize) {
            renderingContext.moveTo(x, 0);
            renderingContext.lineTo(x, tileHeight);
        }
        for (let y = gridStepSize; y < tileHeight; y += gridStepSize) {
            renderingContext.moveTo(0, y);
            renderingContext.lineTo(tileWidth, y);
        }
        renderingContext.stroke();

        const contourHash = Math.sin(tileCoordinates.x * 12.9898 + tileCoordinates.y * 78.233 + tileCoordinates.z * 43.123) * 43758.5453;
        const numContours = Math.floor(Math.abs(contourHash) % 3) + 1;

        renderingContext.strokeStyle = "#2c3447";
        renderingContext.lineWidth = 1.5;
        for (let i = 1; i <= numContours; i++) {
            const radius = Math.abs(Math.sin(contourHash + i)) * 60 + 20;
            const centerX = Math.abs(Math.cos(contourHash * i)) * (tileWidth - 60) + 30;
            const centerY = Math.abs(Math.sin(contourHash / i)) * (tileHeight - 60) + 30;
            renderingContext.beginPath();
            renderingContext.ellipse(centerX, centerY, radius, radius * 0.7, contourHash, 0, Math.PI * 2);
            renderingContext.stroke();
        }

        renderingContext.fillStyle = "#4a5568";
        renderingContext.font = "10px sans-serif";
        renderingContext.fillText(`z${tileCoordinates.z} / ${tileCoordinates.x} / ${tileCoordinates.y}`, 8, 16);
    }
});

export function topographicTileLayer(options) {
    return new TopographicTileLayer(options);
}
