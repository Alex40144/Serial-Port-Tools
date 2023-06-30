import React, { ChangeEvent, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from "../../components/Layout";


const Home = () => {
	const router = useRouter()

	const [baudRate, setBaudRate] = useState(115200);
	const [dataBits, setDataBits] = useState(8);
	const [stopBits, setStopBits] = useState(1);
	const [parity, setParity] = useState("none");
	let TxMode = "HEX" //default
	let RxMode = "HEX" //default

	let port: any, reader: any, readableStreamClosed: any, textEncoder: any, textDecoder: any, writableStreamClosed: any, writer: any, hexEncoder: any, hexDecoder: any
	const loadSerialPorts = async () => {
		if ('serial' in navigator) {
			try {
				//need to close all ports
				port = await navigator.serial.requestPort();
				await port.open({ baudRate: baudRate, bufferSize: 1024, dataBits: dataBits, parity: parity, stopBits: stopBits })

				writer = port.writable.getWriter()

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
							let hexValue = view.getUint8(i).toString(16);
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
					const byteValue = data.charAt(i).toString() + data.charAt(i + 1).toString();
					uint8Array[i / 2] = parseInt(byteValue, 16);
				}
				console.log(uint8Array)
				await writer.write(uint8Array)

			} else {
				// convert ascii to uintarray
				let uint8 = new TextEncoder().encode(data)
				console.log(uint8)
				await writer.write(uint8);
			}
		}
	}

	const sendHex = async (data: any) => {
		if (port) {
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
				const byteValue = data.charAt(i).toString() + data.charAt(i + 1).toString();
				uint8Array[i / 2] = parseInt(byteValue, 16);
			}
			console.log(uint8Array)
			await writer.write(uint8Array)
		}
	}

	const addMessage = (message: string) => {
		let div = document.createElement('div');
		div.innerHTML = '<h3 name="event">' + message + '</h3>';


		let Terminal = document.getElementById("Terminal")
		if (Terminal == null) {
			return
		}
		div.className = 'message title3'
		Terminal.appendChild(div);
		Terminal.scrollTop = Terminal.scrollHeight //scroll with content
	}

	const clearAllMessages = () => {
		let Terminal = document.getElementById("Terminal")
		if (Terminal == null) {
			return
		}
		while (Terminal.firstChild) {
			Terminal.removeChild(Terminal.firstChild);
		}
	}

	const fileUploaded = (event: ChangeEvent<HTMLInputElement>) => {
		event.preventDefault()
		event.stopPropagation()
		if (event.target.files && event.target.files[0]) {
			let reader = new FileReader()
			reader.readAsDataURL(event.target.files[0])
			reader.onload = (event) => {
				if (event.target && event.target.result) {
					let image = new Image()
					let canvas = document.getElementById("image-canvas") as HTMLCanvasElement
					const ctx = canvas.getContext("2d");
					if (!image || !canvas || !ctx) {
						console.error("something went wrong")
						return
					}
					image.crossOrigin = 'anonymous'
					image.src = event.target.result as string
					image.addEventListener("load", () => {
						ctx.save()
						ctx.drawImage(image, 0, 0, 128, 128);
						image.style.display = "none";
					});
				}
			}
		}
	}

	function scaleTo5Bit(value: number): number {
		return Math.floor(value / 8);
	}

	function binaryToHex(binary: string): string {
		return parseInt(binary, 2).toString(16).padStart(8, "0");
	}

	function toBinaryString(values: number[]): string {
		return values.map(value => value.toString(2).padStart(5, "0")).join('');
	}

	function setBit31(hex: string) {
		// Convert hex to BigInt
		let num = BigInt(`0x${hex}`);
		// Set bit 31
		num |= BigInt(1) << BigInt(31);
		// Convert back to hex string
		return num.toString(16);
	}

	function contrastImage(imgData: any, contrast: number) {  //input range [-100..100]
		let d = imgData.data;
		contrast = (contrast / 100) + 1;  //convert to decimal & shift range: [0..2]
		let intercept = 128 * (1 - contrast);
		for (let i = 0; i < d.length; i += 4) {   //r,g,b,a
			d[i] = d[i] * contrast + intercept;
			d[i + 1] = d[i + 1] * contrast + intercept;
			d[i + 2] = d[i + 2] * contrast + intercept;
		}
		return imgData;
	}

	const sendImage = (id: string) => {
		let canvas = document.getElementById(id) as HTMLCanvasElement
		const ctx = canvas.getContext("2d");
		if (!canvas || !ctx) {
			console.error("something went wrong here")
			return
		}

		let res = ctx.getImageData(0, 0, 128, 128) //get pixel data for 128*128 area
		res = contrastImage(res, 30)
		let list = Array.from(res.data) //create an array from data
		list = list.map(scaleTo5Bit) //scale data to 0-31

		//split data into array for each pixel.
		let data: number[][] = []
		while (list.length) {
			data.push(list.splice(0, 4))
		}
		let data2: number[][] = []

		//move pixels around.
		const halfLength = data.length / 2;
		const firstHalf = data.slice(0, halfLength);
		const secondHalf = data.slice(halfLength);
		while (firstHalf.length) {
			data2 = data2.concat(firstHalf.splice(0, 128))
			data2 = data2.concat(secondHalf.splice(0, 128))
		}

		console.log(data2)
		let topHalf: any[] = []
		let bottomHalf: any[] = []

		for (let i = 0; i < data2.length / 2; i++) {
			let topPixel = data2[i]
			let bottomPixel = data2[i + 8192]
			if (!topPixel || !bottomPixel) {
				console.error("ran out of pixels")
				return
			}
			topHalf[i] = [topPixel[0], topPixel[1], topPixel[2]]
			bottomHalf[i] = [bottomPixel[0], bottomPixel[1], bottomPixel[2]]
		}
		let hexString: any[] = []
		let binaryString: any[] = []
		for (let i = 0; i < topHalf.length; i++) {
			if (!topHalf[i] || !bottomHalf[i]) {
				console.error("something went wrong")
				return
			}
			binaryString[i] = toBinaryString(topHalf[i]).concat(toBinaryString(bottomHalf[i]))
			hexString[i] = binaryToHex(binaryString[i])
		}
		hexString[0] = setBit31(hexString[0])
		sendHex(hexString.join(''))
	}

	const spotifyAuth = () => {
		router.push('/SpotifyAuth')
	}

	const spotifyMatrixEnable = (event: React.MouseEvent<HTMLInputElement>) => {
		if (event.currentTarget.checked) {
			const access_token = sessionStorage.getItem('access_token');
			console.log(access_token)
			if (access_token == undefined) {
				event.currentTarget.checked = false
			}
			//start
			const spotifyInterval = setInterval(async () => {
				try {
					const playingResponse = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
						headers: {
							Authorization: `Bearer ${access_token}`,
						},
					});
					const playingData = await playingResponse.json();
					console.log(playingData)
					const album = playingData.item.album;

					// Extract the album art URL
					const imageUrl = album.images[0].url;
					console.log(imageUrl);
					let image = new Image()
					let canvas = document.getElementById("spotify-canvas") as HTMLCanvasElement
					const ctx = canvas.getContext("2d");
					if (!image || !canvas || !ctx) {
						console.error("no image, canvas, or ctx")
						return
					}
					image.crossOrigin = 'anonymous'
					image.src = imageUrl as string
					image.addEventListener("load", () => {
						ctx.save()
						ctx.drawImage(image, 0, 0, 128, 128);
						image.style.display = "none";
						sendImage("spotify-canvas")
					});
				} catch (error: any) {
					if (error.status === 429) {
						clearInterval(spotifyInterval)
					} else {
						console.log("image not loaded")
					}
				}
				let element = document.getElementById("SpotifyMatrixEnable") as HTMLInputElement
				if (element && !element.checked) {
					clearInterval(spotifyInterval)
				}
			}, 2500);
		}
	}

	const expandModule = (event: React.MouseEvent<HTMLDivElement>) => {
		event.preventDefault()
		console.log(event)
		let title = event.currentTarget
		console.log(title)
		let children = document.getElementsByClassName(title.id) as unknown as HTMLElement[]
		for (let i = 0; i < children.length; i++) {
			let child = children[i]
			if (!child) { return }

			if (child.style.display == 'none') {
				//show
				child.style.display = 'block'
				title.classList.add('before:rotate-90')
				title.classList.remove('before:rotate-0')

			} else {
				//hide
				child.style.display = 'none'
				title.classList.add('before:rotate-0')
				title.classList.remove('before:rotate-90')
			}
		}
	}

	return (
		<Layout>
			<div className="flex flex-row justify-center p-5 bg-gray-600 h-full min-h-screen">
				<div className='flex flex-col bg-white w-2/12 rounded-l'>
					<div className='py-4'>
						<div className='before:inline-block before:content-["\25B6"] select-none before:rotate-90' onClick={expandModule} id="matrix-spotify">
							Spotify Matrix
						</div>

						<div className='matrix-spotify p-2'>
							<button onClick={spotifyAuth} className="w-full p-2 mx-0 my-2 border-4 rounded focus:border-pink-500 focus:outline-none">Auth</button>
							Enable
							<label className="switch m-2">
								<input type="checkbox" name="SpotifyMatrixEnable" id='SpotifyMatrixEnable' onClick={spotifyMatrixEnable} />
								<span className="slider round"></span>
							</label>
							<canvas id='spotify-canvas' width={128} height={128} className='m-auto p-2' />
						</div>
					</div>
					<div className='py-4'>
						<div className='before:inline-block before:content-["\25B6"] select-none before:rotate-90' onClick={expandModule} id="matrix-image">
							Matrix Image
						</div>
						<div className='matrix-image p-2'>
							<input type="file" name="file" onChange={fileUploaded} accept=".jpg" />
							<canvas id='image-canvas' width={128} height={128} className='m-auto p-2' />
							<button onClick={() => sendImage("image-canvas")} className="w-full p-2 mx-0 my-2 border-4 rounded focus:border-pink-500 focus:outline-none">Send</button>
						</div>
					</div>
				</div>
				<div className="flex flex-col-reverse w-6/12 h-65vh bg-white border-x-4 border-blue-600">
					<div className="h-0 weirdflex overflow-y-auto" id="Terminal" />

				</div>
				<div className="flex flex-col w-2/12 bg-white rounded-r">
					<div className='m-2'>
						<h2 className='m-2 text-lg font-bold'> Port Settings</h2>
						<div>
							<h3 className='m-2'>Baud Rate</h3>
							<div className="select">
								<select value={baudRate} onChange={(e) => { setBaudRate(parseInt(e.target.value)); }}>
									<option value={9600}> 9600 </option>
									<option value={115200}> 115200 </option>
									<option value={460800}> 460800 </option>
									<option value={921600}> 921600 </option>
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
							<input type="radio" name="TxMode" onChange={(e) => { TxMode = "ASCII" }} />
							ASCII
						</label>
						<label className='form-control'>
							<input type="radio" name="TxMode" onChange={(e) => { TxMode = "HEX" }} defaultChecked />
							HEX
						</label>
						<h2 className='m-2 text-lg font-bold'> Rx Settings</h2>
						<label className='form-control'>
							<input type="radio" name="RxMode" onChange={(e) => { RxMode = "ASCII" }} />
							ASCII
						</label>
						<label className='form-control'>
							<input type="radio" name="RxMode" onChange={(e) => { RxMode = "HEX" }} defaultChecked />
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