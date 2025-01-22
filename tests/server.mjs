// Simple server adapted from https://developer.mozilla.org/en-US/docs/Learn/Server-side/Node_server_without_framework:
import * as path from "path";
import commandLineArgs from "command-line-args";
import esMain from 'es-main';
import LocalWebServer from 'local-web-server'

const ROOT_DIR = path.join(process.cwd(), "./");

export default async function serve(port) {
    if (!port)
        throw new Error("Port is required");
    const ws = await LocalWebServer.create({
        port: port,
        directory: ROOT_DIR,
    });
 
    process.on("exit", () =>   ws.server.close());
}

function main() {
    const optionDefinitions = [
        { name: "port", type: Number, defaultValue: 8080, description: "Set the test-server port, The default value is 8010." },
    ];
    const options = commandLineArgs(optionDefinitions);
    serve(options.port);
}

if (esMain(import.meta))
    main();
