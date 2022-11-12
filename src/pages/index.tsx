import React, { useEffect, useState } from 'react'
import Layout from "../../components/Layout";



const Home = () => {
	let port: any, reader: any, log: any, writer: any
	let lineReader: any = undefined
	const loadSerialPorts = async () => {
		if ('serial' in navigator) {
			try {
				port = await navigator.serial.requestPort();
				await port.open({ baudRate: 115200, bufferSize: 1024, dataBits: 8, parity: "none", stopBits: 1 });
				lineReader = port.readable
					.pipeThrough(new TextDecoderStream())
					.pipeThrough(new TransformStream(new LineBreakTransformer()))
					.getReader();
				monitorPort()
			}
			catch (err) {
				console.error('There was an error opening the serial port:', err);
			}
		}
		else {
			console.error('The Web serial API not enabled in your browser.');
		}
	}

	class LineBreakTransformer {
		container: string;
		constructor() {
			this.container = ''
		}

		transform(chunk: any, controller: any) {
			this.container += chunk
			const lines = this.container.split('\r\n')
			var temp = lines.pop()
			if (temp != undefined) {
				this.container = temp
			}
			lines.forEach(line => controller.enqueue(line))
		}

		flush(controller: any) {
			controller.enqueue(this.container)
		}
	}


	const monitorPort = async () => {
		while (port.readable) {
			//const textDecoder = new TextDecoderStream();
			try {
				while (true) {
					const { value, done } = await lineReader.read()
					if (done) {
						// Allow the serial port to be closed later.
						reader.releaseLock()

						break
					}
					if (value) {
						console.log(value)
						addMessage(value)
					}
				}
			} catch (error) {
				// TODO: Handle non-fatal read error.
			}
		}
	}

	const addMessage = (message: string) => {
		var div = document.createElement('div');
		div.innerHTML = '<h3 name="event">' + message + '</h3>';


		var Terminal = document.getElementById("Terminal")
		if (Terminal == null) {
			return
		}
		div.className = 'message title3'
		Terminal.appendChild(div);
	}

	const clearAllMessages = () => {
		var Terminal = document.getElementById("Terminal")
		if (Terminal == null) {
			return
		}
		while (Terminal.firstChild) {
			Terminal.removeChild(Terminal.firstChild);
		}
	}


	return (
		<Layout>
			<div className="flex flex-row justify-center p-5 bg-gray-600 h-full min-h-screen">
				<div className="flex flex-col-reverse w-7/12 h-65vh bg-white">
					<div className="h-0 weirdflex overflow-y-auto" id="Terminal" />

				</div>
				<div className="flex flex-col w-2/12 bg-white border-l-4 border-blue-600">
					<button onClick={loadSerialPorts} className="flex">Connect to Port</button>
					<button onClick={clearAllMessages} className="flex" >Clear</button>
				</div>
			</div>
		</Layout>
	);
};

export default Home;