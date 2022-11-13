import React, { useEffect, useState } from 'react'
import Layout from "../../components/Layout";



const Home = () => {

	const [baudRate, setBaudRate] = useState(9600);
	var keepReading: boolean

	let port: any, reader: any, log: any, writer: any
	const loadSerialPorts = async () => {
		if ('serial' in navigator) {
			try {
				//need to close all ports
				port = await navigator.serial.requestPort();
				await port.open({ baudRate: baudRate, bufferSize: 1024, dataBits: 8, parity: "none", stopBits: 1 });
				reader = port.readable
					.pipeThrough(new TextDecoderStream())
					.pipeThrough(new TransformStream(new LineBreakTransformer()))
					.getReader();
				keepReading = true
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

	const removeSerialPorts = async () => {
		if (keepReading == true) { //don't close if not open
			keepReading = false
			console.log(keepReading)
			const textEncoder = new TextEncoderStream();
			const writer = textEncoder.writable.getWriter();
			const writableStreamClosed = textEncoder.readable.pipeTo(port.writable);
			const textDecoder = new TextDecoderStream();
			const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);

			reader.cancel();
			await readableStreamClosed.catch(() => { /* Ignore the error */ });

			writer.close();
			await writableStreamClosed;

			await port.close();
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
		while (port.readable && keepReading) {
			//const textDecoder = new TextDecoderStream();
			try {
				while (true) {
					const { value, done } = await reader.read()
					if (done) {
						reader.releaseLock()

						break
					}
					if (value) {
						addMessage(value)
					}
				}
			} catch (error) {
				// TODO: Handle non-fatal read error.
			}
		}
		console.log("closing port")
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
		Terminal.scrollTop = Terminal.scrollHeight //scroll with content
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
					<div>
						<h2> Port Settings</h2>
						<div>
							<h3>Baud Rate</h3>
							<select
								value={baudRate}
								onChange={(e) => {
									setBaudRate(parseInt(e.target.value));
								}}
							>
								<option value={9600}> 9600 </option>
								<option value={115200}> 115200 </option>
								<option value={0}> Custom </option>

							</select>

						</div>
						<button onClick={loadSerialPorts} className="flex">Connect Port</button>
						<button onClick={removeSerialPorts} className="flex">Disconnect Port</button>
					</div>
					<div>
						<h2> Receive Settings</h2>
					</div>
					<div>
						<h2> Send Settings</h2>
					</div>
					<button onClick={clearAllMessages} className="flex" >Clear</button>
				</div>
			</div>
		</Layout>
	);
};

export default Home;