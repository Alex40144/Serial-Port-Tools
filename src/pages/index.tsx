import React, { useEffect, useState } from 'react'
import Layout from "../../components/Layout";



const Home = () => {

	const [baudRate, setBaudRate] = useState(115200);
	const [dataBits, setDataBits] = useState(8);
	const [stopBits, setStopBits] = useState(1);
	const [parity, setParity] = useState("none");
	const [input, setInput] = useState("");


	var keepReading: boolean

	let port: any, ascii_reader: any, log: any, writer: any
	const loadSerialPorts = async () => {
		if ('serial' in navigator) {
			try {
				//need to close all ports
				port = await navigator.serial.requestPort();
				await port.open({ baudRate: baudRate, bufferSize: 1024, dataBits: dataBits, parity: parity, stopBits: stopBits });
				ascii_reader = port.readable
					.pipeThrough(new TextDecoderStream())
					.pipeThrough(new TransformStream(new LineBreakTransformer()))
					.getascii_Reader();
				keepReading = true
				addMessage("--CONNECTED--")
				monitorPort()
			}
			catch (err) {
				console.error('There was an error opening the serial port:', err);
				console.log("probably open in another application")
			}
		}
		else {
			console.error('The Web serial API not enabled in your browser.');
		}
	}

	const removeSerialPorts = async () => {
		try {
			if (port.readable) { //don't close if not open
				keepReading = false
				console.log(keepReading)
				const textEncoder = new TextEncoderStream();
				const writer = textEncoder.writable.getWriter();
				const writableStreamClosed = textEncoder.readable.pipeTo(port.writable);
				const textDecoder = new TextDecoderStream();
				const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);

				ascii_reader.cancel();
				await readableStreamClosed.catch(() => { /* Ignore the error */ });

				writer.close();
				await writableStreamClosed;

				await port.close();
			}
		} catch {
			//port wasn't open
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
					const { value, done } = await ascii_reader.read()
					if (done) {
						ascii_reader.releaseLock()

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

	const sendInput = () => {

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
					<div className='m-2'>
						<h2 className='m-2 text-lg font-bold'> Port Settings</h2>
						<div>
							<h3 className='m-2'>Baud Rate</h3>
							<div className="select">
								<select value={baudRate} onChange={(e) => { setBaudRate(parseInt(e.target.value)); }}>
									<option value={9600}> 9600 </option>
									<option value={115200}> 115200 </option>
									<option value={0}> Custom </option>
								</select>
							</div>
							<h3 className='m-2'>Data Length</h3>
							<div className="select">
								<select value={dataBits} onChange={(e) => { setDataBits(parseInt(e.target.value)); }}>
									<option value={7}> 7 bits </option>
									<option value={8}> 8 bits </option>
								</select>
							</div>
							<h3 className='m-2'>Parity</h3>
							<div className="select">
								<select value={parity} onChange={(e) => { setParity(e.target.value); }}>
									<option value={"none"}> None </option>
									<option value={"even"}> Even </option>
									<option value={"odd"}> Odd </option>
								</select>
							</div>
							<h3 className='m-2'>Stop Bits</h3>
							<div className="select">
								<select value={stopBits} onChange={(e) => { setStopBits(parseInt(e.target.value)); }}>
									<option value={1}> 1 </option>
									<option value={2}> 2 </option>
								</select>
							</div>
						</div>
						<button onClick={loadSerialPorts} className="flex m-2 mx-auto bg-green-600 p-2 rounded">Connect Port</button>
						<button onClick={removeSerialPorts} className="flex m-2 mx-auto bg-red-600 p-2 rounded">Disconnect Port</button>
					</div>
					<div className='m-2'>
						<h2 className='m-2 text-lg font-bold'> Receive Settings</h2>
						<label className='form-control'>
							<input type="radio" name="RxMode" />
							ASCII
						</label>
						<label className='form-control'>
							<input type="radio" name="RxMode" />
							HEX
						</label>
					</div>
					<div>
						<h2 className='m-2 text-lg font-bold'> Send Settings</h2>
					</div>
					<button onClick={clearAllMessages} className="flex m-2 mx-auto bg-blue-600 p-2 rounded" >Clear</button>
					<input className='' value={input} onChange={(e) => { setInput(e.target.value); }} onKeyDown={(e) => { if (e.key == 'Enter') { sendInput() } }} />
				</div>
			</div>
		</Layout>
	);
};

export default Home;