// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: red; icon-glyph: microscope; share-sheet-inputs: plain-text;
let widgetInputRAW = args.widgetParameter;
let printerIP = null;
let printerApiUrl = "";


if (widgetInputRAW == null) {
  	//initialSetupRequest();
  	//console.log("Printer IP is missing");
  	//return;
  	widgetInputRAW = "192.168.178.42";
}


  thin_font = Font.regularRoundedSystemFont(13);
  small_font = Font.regularRoundedSystemFont(17);
  bold_font = Font.heavyRoundedSystemFont(15);
  title_font = Font.heavyRoundedSystemFont(19)
  spacer_size = null
  

main();



async function main(){
	printerIp = widgetInputRAW.toString();
	
	console.log("IP Valid " + validateIpAddress(printerIp));

	if(!validateIpAddress(printerIp)){
		initialSetupRequest();
  		console.log("Printer IP is missing");
  		return;
	}

	printerUrl = 'http://' + printerIp;
	printerApiUrl = 'http://' + printerIp + '/api/telemetry';
	console.log("PrinterIP: " + printerIp + "; Telemetry API: " + printerApiUrl);

	
	let data = await loadTelemetryData();

	var widget = new ListWidget();
	widget.url = printerUrl;

	let headerText = "Prusa Connect local";
	var headerTextWidget = widget.addText(headerText);
	headerTextWidget.font = title_font;
	headerTextWidget.textColor = new Color('#f58a42');


	if(data.time_est){

    var remainingPrintTimeDate = new Date(0);
	remainingPrintTimeDate.setSeconds(data.time_est); // specify value for SECONDS here
	var remainingPrintTimeString = remainingPrintTimeDate.toISOString().substr(11, 8);
	console.log(remainingPrintTimeString);
	console.log(data.time_est);
	console.log(remainingPrintTimeDate);

	let currentTimeInSeconds = Math.floor(new Date().getTime() / 1000);

	console.log(currentTimeInSeconds);
	let secondsTillEnd = currentTimeInSeconds + parseInt(data.time_est);
	console.log(secondsTillEnd);
	var finalPrintingTimeDate = new Date(0);
	finalPrintingTimeDate.setSeconds(secondsTillEnd);
	console.log(finalPrintingTimeDate);
	
	var finalPrintTimeString = finalPrintingTimeDate.toISOString();
	console.log(finalPrintTimeString);

console.log(toLocal(finalPrintingTimeDate));

	console.log("Progress: " + data.progress + "%");
	console.log("Nozzle Temperature: " + data.temp_nozzle + "°");
	console.log("Bed Temperature: " + data.temp_bed + "°");



	widget.addSpacer(spacer_size);

	let progressText = "Progress: " + data.progress + "% - Remaining Duration: " + remainingPrintTimeString;
	var progressTextWidget = widget.addText(progressText);
	progressTextWidget.font = thin_font;


	
	let temperatureText = "Temperature - Nozzle: " + data.temp_nozzle + "° - Bed: " + data.temp_bed + "°";
	var temperatureTextWidget = widget.addText(temperatureText);
	temperatureTextWidget.font = thin_font;


	widget.addSpacer(spacer_size);


	let doneAtText = "End time: " + toLocal(finalPrintingTimeDate);
	var doneAtTextWidget = widget.addText(doneAtText);
	doneAtTextWidget.font = bold_font;
	
}

	Script.setWidget(widget);
	widget.presentMedium();
	Script.complete();

	
}




async function loadTelemetryData(){
	console.log("Load Data");
	let request = new Request(printerApiUrl);
	request.timeoutInterval = 5;


	try {
  		
		let data = await request.loadJSON();
		console.log(data);

		return data;

	} catch(e) {
		console.log(e);
		
	} finally {
		console.log(request.response);
	}

		


}


function initialSetupRequest(){

	var widget = new ListWidget();
	var info = widget.addText('Please provide IP address to printer');
	info.font = Font.systemFont(13);

	Script.setWidget(widget);
	widget.presentMedium();
	Script.complete();

}

function toLocal(date) {
  var local = new Date(date);
  local.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return local.toJSON();
}

function validateIpAddress(inputIp){
	return inputIp.match("^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$");
}


