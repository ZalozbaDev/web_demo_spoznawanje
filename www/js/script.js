// set up basic variables for app
const $record = $('#record');
const soundClips = document.querySelector('.sound-clips');
const canvas = document.querySelector('.visualizer');
const mainSection = document.querySelector('.wrapper');

// flag when recording
let recording = false;
let recognizing = { pos : 0, posDeg : [-1,1], runId : false };

// visualiser setup - create web audio api context and canvas
let audioCtx;
const canvasCtx = canvas.getContext("2d");

//main block for doing the audio recording
if (navigator.mediaDevices.getUserMedia) {

	console.log('getUserMedia supported.');

	const constraints = { audio: true };
	let chunks = [];

	let onSuccess = function(stream) {
		
		let extension = "";
		if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) { extension = "ogg"; }
		else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) { extension = "webm"; }
		console.log('Supported audio type: '+extension);
		const mediaRecorder = new MediaRecorder(stream, { mimeType : 'audio/'+extension+';codecs=opus' });

		let startRecording = function() {
			mediaRecorder.start();
			console.log(mediaRecorder.state);
			console.log("recorder started");
			$record.addClass('recording');
			let recordingTimer = 0;
			$record.html("Lampa słucha … " + recordingTimer + " s");
			recording = window.setInterval(function() {
				$record.html("Lampa słucha … " + ++recordingTimer + " s");
				if (recordingTimer == 5) {
					window.clearInterval(recording);
					stopRecording();
				}
			}, 1000);
			$('.hide-when-recording').hide();
			canvas.style.display = "block";
			visualize(stream);
		}
		
		let stopRecording = function() {
			mediaRecorder.stop();
			console.log(mediaRecorder.state);
			console.log("recorder stopped");
			$record.removeClass('recording');
			$record.addClass('recognizing');
			recording = false;
			if (recognizing.runId) { window.clearInterval(recognizing.runId); }
			recognizing.runId = window.setInterval(function() {
				let posB = recognizing.posDeg[recognizing.pos];
				$record.css("transform","rotate(" + recognizing.posDeg[recognizing.pos] + "deg)");
				recognizing.pos = ++recognizing.pos%recognizing.posDeg.length;
			}, 66);
			$record.html("… analyzuju …");
			canvas.style.display = "none";
		}
		
		$record.click(function() {
			if (recognizing.runId) { return; }
			if (recording) {
				window.clearInterval(recording);
				stopRecording();
			} else {
				startRecording();
			}
		});

		mediaRecorder.onstop = function(e) {
			const blob = new Blob(chunks, { type : 'audio/'+extension });
			chunks = [];
			console.log("recorder stopped");
			
			// send blob to server
			var formData = new FormData();
			formData.append('recfile', blob);
			$.ajax('save.php', {
				method: "POST",
				data: formData,
				processData: false,
				contentType: false,
				success: lampa.getAsrResult,
				error: console.log
			});
			console.log("sent recording to server");
		}

		mediaRecorder.ondataavailable = function(e) {
			chunks.push(e.data);
		}
	}

	let onError = function(err) {
		console.log('The following error occured: ' + err);
	}

	navigator.mediaDevices.getUserMedia(constraints).then(onSuccess, onError);

} else {
	console.log('getUserMedia not supported on your browser!');
}

function visualize(stream) {
	
	if (!audioCtx) {
		audioCtx = new AudioContext();
	}

	const analyser = audioCtx.createAnalyser();
	analyser.fftSize = 2048;
	analyser.smoothingTimeConstant = 0;
	analyser.minDecibels = -80;
	analyser.maxDecibels = -40;
	const bufferLength = analyser.frequencyBinCount;
	const dataArray = new Uint8Array(bufferLength);

	const source = audioCtx.createMediaStreamSource(stream);
	source.connect(analyser);
	//analyser.connect(audioCtx.destination);

	function draw() {
		const WIDTH = canvas.width
		const HEIGHT = canvas.height;

		if (recording) {
			requestAnimationFrame(draw);
		}

		analyser.getByteFrequencyData(dataArray);

		let idata = 0, iband = 0, bandCount = 0, bandWidth = 0, bandData = [], dataFinished = false, maxdata = Math.round(0.5*bufferLength);
		while (!dataFinished) {
			bandData[iband] = 0;
			bandCount = 0;
			bandWidth = idata + Math.pow(2,iband);
			while (idata < bandWidth) {
				if (idata < maxdata) {
					bandData[iband] += dataArray[idata];
					bandCount++;
					idata++;
				} else {
					dataFinished = true;
					break;
				}
			}
			if (!dataFinished) {
				bandData[iband] = Math.round(bandData[iband]/bandCount);
				iband++;
			}
		}
		bandCount = bandData.length;
		
		var barWidth = WIDTH / bandCount - 1;
		var barHeight;
		let x = 0;
		canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
		for (var i = 0; i < bandCount; i++) {
			barHeight = Math.floor(bandData[i]/4); // 0..63
			canvasCtx.fillStyle = 'rgb(' + (0+4*barHeight) + ',' + (136-2*barHeight) + ',' + (204-2*barHeight) + ')';
			canvasCtx.fillRect(x,64-barHeight,barWidth,66);
			x += barWidth + 1;
		}
	}
	draw();
}

let lampa = {
	on : false,
	clr : "WHITE",
	bri : 100,
	clrs : {
		WHITE : [255,255,255,"běła"],
		WARMWHITE : [255,245,222,"ćopłoběła"],
		COLDWHITE : [229,255,255,"zymnoběła"],
		RED : [255,51,51,"čerwjena"],
		GREEN : [51,255,51,"zelena"],
		BLUE : [51,102,255,"módra"],
		ORANGE : [255,153,51,"oranžowa"],
	},
	cta : ["Lampa čaka …", "Hišće něšto?","Što nětko?","Dalši komando, prošu!"],
	getAsrResult : function(res) {
		var resJson = JSON.parse(res);
		console.log(resJson);
		var asrLines = {"cmd":[],"wrd":[],"raw":[]};
		for (var key in resJson.asr) {
			asrLines.raw.push(resJson.asr[key]);
			if (resJson.asr[key].indexOf('Result [') == 0) {
				clean = resJson.asr[key].replace(/Result \[.+?\]\: /, "");
				if (cmd = clean.match(/_(.+)_/)) {
					asrLines.cmd.push(cmd[1]);
				} else {
					asrLines.wrd.push(clean);
				}
			}
		};
		
		$('.hide-when-recording').show();
		var dgb = "<br><span>returnVal: " + resJson.error + " / clipId: " + resJson.file + "</span>";
		if (asrLines.cmd.length > 0) {
			$('h1').html('Lampa je zrozumiła!');
			$('p.asr-output').html("~ " + asrLines.wrd.join(" ") + " ~<br>" + asrLines.cmd.join(" ") + dgb);
		} else {
			$('h1').html('Lampa nažel njezrozumi …');
			$('p.asr-output').html(":-(" + dgb);
		}
		$record.html(lampa.cta[Math.floor(lampa.cta.length*Math.random())]);
		$record.removeClass('recognizing');
		
		console.log(asrLines);
		switch (asrLines.cmd[0]) {
			case "BRIGHTNESS":
				lampa.setBri(asrLines.cmd[1]);
				break;
			case "SETCOLOR":
				lampa.setClr(asrLines.cmd[1]);
				break;
			case "LIGHTON":
				lampa.on = true;
				break;
			case "LIGHTOFF":
				lampa.on = false;
				break;
		}
		lampa.update();
		if (recognizing.runId) {
			window.clearInterval(recognizing.runId);
			recognizing.runId = false;
			recognizing.pos = 0;
			$record.css("transform", "");
		}
	},
	setBri : function(value) {
		if (value.indexOf("+") > -1 || value.indexOf("-") > -1) {
			this.bri = this.bri + Math.round(value);
			if (this.bri > 100) { this.bri = 100; }
			if (this.bri < 0) { this.bri = 0; }
		} else {
			this.bri = Math.round(value);
		}
		lampa.on = true;
	},
	setClr : function(color) {
		this.clr = color;
		lampa.on = true;
	},
	update : function() {
		if (!this.on) {
			$('.wrapper').animate({ backgroundColor: "rgb(51,51,51)" }, 500);
		} else {
			$('.wrapper').animate({ backgroundColor: lampa.getTargetColor() }, 500);
		}
		$('p.lampa-status').html("Lampa " + (lampa.on?"so swěći":"je hasnjena") + " (setup: " + lampa.clrs[lampa.clr][3] + " barba, " + lampa.bri + "%)");
	},
	getTargetColor : function() {
		var c = [
			this.getColorValue(this.clrs[this.clr][0], this.bri),
			this.getColorValue(this.clrs[this.clr][1], this.bri),
			this.getColorValue(this.clrs[this.clr][2], this.bri),
		];
		return "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")";
	},
	getColorValue : function(val,bri) {
		return Math.round(51 + val * bri/125); // set minimum to gray (#333)
	}
}

window.onresize = function() {
	canvas.width = mainSection.offsetWidth;
}

window.onresize();
