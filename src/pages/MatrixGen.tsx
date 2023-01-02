import Layout from '../../components/Layout'
import React, { ChangeEvent, useEffect, useState } from 'react'
import { list } from 'postcss';

const MatrixGen = () => {
    const [selectedFile, setSelectedFile] = useState();
    const fileUploaded = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            var reader = new FileReader()
            reader.readAsDataURL(event.target.files[0])
            reader.onload = (event) => {
                setSelectedFile(event.target?.result)
            }
        }
    }

    const copyText = (event) => {
        var textToCopy = document.getElementById("output");
        //select the text in the text box
        textToCopy.select();
        //copy the text to the clipboard
        document.execCommand("copy");
    }

    function scaleTo5Bit(value: number): number {
        return Math.floor(value / 8);
    }

    function binaryToHex(binary: string): string {
        return parseInt(binary, 2).toString(16);
    }

    function toBinaryString(values: number[]): string {
        return values.map(value => value.toString(2)).join('');
    }

    function setBit31(hex: string) {
        // Convert hex to BigInt
        var num = BigInt(`0x${hex}`);
        // Set bit 31
        num |= BigInt(1) << BigInt(31);
        // Convert back to hex string
        return num.toString(16);
    }

    const run = () => {
        var image = new Image()
        if (!image) {
            return
        }
        image.src = selectedFile
        var canvas = document.getElementById("canvas")
        const ctx = canvas.getContext("2d");
        //ctx.clearRect(0, 0, canvas.width, canvas.height);
        image.addEventListener("load", () => {
            ctx.save()
            ctx.drawImage(image, 0, 0, 64, 64);
            image.style.display = "none";
        });
        var res = ctx.getImageData(0, 0, 64, 64) //get pixel data for 64*60 area
        var list = Array.from(res.data) //create an array from data
        list = list.map(scaleTo5Bit) //scale data to 0-31

        //split data into array for each pixel.
        let data: any[][] = []
        while (list.length) {
            data.push(list.splice(0, 4))
        }
        console.log(data)

        let topHalf: any[][] = []
        let bottomHalf: any[][] = []

        for (let i = 0; i < data.length / 2; i++) {
            let topPixel = data[i]
            topHalf[i] = [topPixel[0], topPixel[1], topPixel[2]]
            let bottomPixel = data[i + 2048]
            bottomHalf[i] = [bottomPixel[0], bottomPixel[1], bottomPixel[2]]
        }

        let hexString: any[] = []
        let binaryString: any[] = []
        for (let i = 0; i < topHalf.length; i++) {
            binaryString[i] = toBinaryString(topHalf[i]).concat(toBinaryString(bottomHalf[i]))
            hexString[i] = binaryToHex(binaryString[i])
        }
        hexString[0] = setBit31(hexString[0])
        console.log(binaryString)
        console.log(hexString)
        let output = document.getElementById("output")
        output.innerHTML = hexString.join('')
    }
    return (
        <Layout>
            <div className="container mx-auto flex flex-col items-center justify-center h-screen p-4">
                <h1 className="text-5xl md:text-[5rem] leading-normal font-extrabold text-gray-700">
                    LED Matrix Generator
                </h1>
                <p>Used to generate data for the LED matrix</p>
                <p>Step 1: upload image</p>
                <input type="file" name="file" onChange={fileUploaded} accept=".jpg" />
                <div>
                    <button onClick={run} className="w-full p-2 mx-0 my-2 border-4 rounded focus:border-pink-500 focus:outline-none">Run</button>
                </div>
                <canvas id='canvas' />

                <textarea id='output' className='w-1/2 h-60'></textarea>
                <button onClick={copyText} className="w-full p-2 mx-0 my-2 border-4 rounded focus:border-pink-500 focus:outline-none">Copy To Clipboard</button>
            </div>
        </Layout>
    );
};
export default MatrixGen;