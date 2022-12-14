import React, { useEffect, useState } from 'react'
import Layout from "../../components/Layout";
import { Readable, Transform } from 'stream';




const Home = () => {

	const [baudRate, setBaudRate] = useState(115200);
	const [dataBits, setDataBits] = useState(8);
	const [stopBits, setStopBits] = useState(1);
	const [parity, setParity] = useState("none");

	var TxMode = "ASCII" //default
	var RxMode = "ASCII" //default

	var keepReading: boolean

	let port: any, reader: any, readableStreamClosed: any, textEncoder: any, textDecoder: any, writableStreamClosed: any, writer: any, hexEncoder: any, hexDecoder: any
	const loadSerialPorts = async () => {
		if ('serial' in navigator) {
			try {
				//need to close all ports
				port = await navigator.serial.requestPort();
				await port.open({ baudRate: baudRate, bufferSize: 1024, dataBits: dataBits, parity: parity, stopBits: stopBits })

				writer = port.writable.getWriter()

				keepReading = true
				addMessage("--CONNECTED--")
				monitorPort()
			}
			catch (err) {
				console.error('There was an error opening the serial port:', err);
				addMessage("--ERROR: Could not Connect--")
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

				await reader.cancel();
				writer.releaseLock()
				await port.close();

				port = undefined
				addMessage("--DISCONNECTED--")
			}
		} catch {
			//port wasn't open
		}
	}


	const monitorPort = async () => {
		reader = port.readable.getReader();

		try {
			while (true) {
				const { value, done } = await reader.read()
				if (done) {
					reader.releaseLock()

					break
				}
				if (value) {
					console.log(value.buffer)
					if (RxMode == "HEX") {
						const view = new DataView(value.buffer);
						for (let i = 0; i < value.buffer.byteLength; i += 1) {
							var hexValue = view.getUint8(i).toString(16);
							addMessage(hexValue)
						}
					} else {
						const decoder = new TextDecoder();
						const asciiString = decoder.decode(value.buffer);
						addMessage(asciiString)
					}
				}

			}
		} catch (error) {
			console.log(error)
			await reader.cancel();
			await removeSerialPorts();
			console.log("listenToPort error");
		}
	}

	const sendInput = async () => {
		console.log(TxMode)
		let element = (document.getElementById("dataToSend") as HTMLInputElement)
		if (element && port) {
			let data = element.value;
			element.value = ''


			if (TxMode == "HEX") {
				if (!/^[0-9a-fA-F]*$/.test(data)) {
					addMessage("--Hex must only contain valid characters--")
					return
				}

				const hexLength = data.length;
				if (hexLength % 2 !== 0) {
					addMessage("--Hex must contain an even number of characters--")
					return
				}


				const uint8Array = new Uint8Array(hexLength / 2);

				for (let i = 0; i < hexLength; i += 2) {
					const byteValue = parseInt(data.substr(i, 2), 16);
					uint8Array[i / 2] = byteValue;
				}
				await writer.write(uint8Array)

			} else {
				// convert ascii to uintarray
				var uint8 = new TextEncoder().encode(data)
				console.log(uint8)
				await writer.write(uint8);
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
						<h2 className='m-2 text-lg font-bold'> Tx Settings</h2>
						<label className='form-control'>
							<input type="radio" name="TxMode" onChange={(e) => { TxMode = "ASCII" }} defaultChecked />
							ASCII
						</label>
						<label className='form-control'>
							<input type="radio" name="TxMode" onChange={(e) => { TxMode = "HEX" }} />
							HEX
						</label>
						<h2 className='m-2 text-lg font-bold'> Rx Settings</h2>
						<label className='form-control'>
							<input type="radio" name="RxMode" onChange={(e) => { RxMode = "ASCII" }} defaultChecked />
							ASCII
						</label>
						<label className='form-control'>
							<input type="radio" name="RxMode" onChange={(e) => { RxMode = "HEX" }} />
							HEX
						</label>
					</div>
					<button onClick={clearAllMessages} className="flex m-2 mx-auto bg-blue-600 p-2 rounded" >Clear</button>
					<textarea className='border p-2 m-2 h-full border-black rounded' id='dataToSend' onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendInput() } }} />

				</div>
			</div>
		</Layout>
	);
};

export default Home;