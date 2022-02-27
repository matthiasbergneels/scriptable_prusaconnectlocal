// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: red; icon-glyph: microscope; share-sheet-inputs: plain-text;

thin_font = Font.regularRoundedSystemFont(13);
  
  
bold_font = Font.heavyRoundedSystemFont(17);
subtext_font = Font.regularRoundedSystemFont(13);
  
title_font = Font.heavyRoundedSystemFont(19);
footer_font = Font.regularRoundedSystemFont(13);
DYNAMIC_SPACER_SIZE = null;
  
const STYLING = {
	FONTS: {
		TITLE: Font.heavyRoundedSystemFont(19),
		FOOTER: Font.regularRoundedSystemFont(13),

		CONTENT_TITLE_BOLD: Font.heavyRoundedSystemFont(17),
		CONTENT: Font.regularRoundedSystemFont(13),
		CONTENT_SMALL_BOLD: Font.heavyRoundedSystemFont(13),
		CONTENT_HINT: Font.regularRoundedSystemFont(10)
	},

	COLORS: {
		PRUSA_ORANGE: new Color("#f58a42"),
		HINT_GREY: new Color("#999999"),
		IMAGE: Device.isUsingDarkAppearance() ? new Color("#03d3fc") : new Color("#0000ff")
	},

	DYNAMIC_SPACER_SIZE: null
};
  
const COLORS = {
	PRUSA_ORANGE: new Color(""),
	HINT_GREY: new Color("#999999")
};  
  
class PrusaPrinter{

	// Constants  
	static API_PATH = "/api/telemetry";
  	static STATUS = {
  		INVALIDIP: "INVALID_IP",
		NOTAVAILABLE: "NA",
		IDLE: "IDLE",
		PRINTING: "PRINTING"
  	};



	PRINTER_STATUS_INVALIDIP = "INVALID_IP";
	PRINTER_STATUS_NOTAVAILABLE = "NA";
	PRINTER_STATUS_IDLE = "IDLE";
	PRINTER_STATUS_PRINTING = "PRINTING";

	
	// Members - Printer Data
	commonData = {
  		ip: null,
  		url: null,
  		status: null,
  		type: null,
  		latestUpdate: new Date()
	};

	printerIp = "";
	printerUrl = "http://";
	printerStatus = "";
	printerType = null;
	printerLatestUpdate = new Date();
	
	// Members - Telemetry Data general
	rawTelemetryData = {};
	telemetryGeneral = {
  		dataRetrievalDate: null,
		temperatureNozzle: 0,
		temperatureBed: 0,
		material: ""
		
	}

	// Members - Telemtry Data printing
	telemetryPrinting = {
		projectName: "",
		remainingTimeInSeconds: 0,
		progressInPercentage: 0,
		currentHeight: 0.0
	};

	constructor(printerIp){	
  		if(!PrusaPrinter.isIpAddressValid(printerIp)){
			this.printerStatus = this.PRINTER_STATUS_INVALIDIP;
			console.log(this.printerStatus);
			return;
  		}
		
		this.printerIp = printerIp;
		this.printerUrl = this.printerUrl + printerIp;
		console.log(this.printerIp + " " + this.printerUrl);
	}

	async loadRemoteTelemetryData(printer){
  
  		let request = new Request(this.printerUrl + PrusaPrinter.API_PATH);
		request.timeoutInterval = 5;

		try {
			let data = await request.loadJSON();
		
			if(request.response && request.response.statusCode == 200){
  				this.printerType = request.response.headers.Server;
  				console.log(data);
				this.rawTelemetryData = data;
				this.parseTelemetryRawDataAndSetPrinterStatus();
			}
			
		} catch(e) {
			this.printerStatus = this.PRINTER_STATUS_NOTAVAILABLE;
			console.log(e);
		}

		return null;
	}

	
	parseTelemetryRawDataAndSetPrinterStatus(){ 
  		this.telemetryGeneral = {
			temperatureNozzle: parseInt(this.rawTelemetryData.temp_nozzle),
			temperatureBed: parseInt(this.rawTelemetryData.temp_bed),
			material: this.rawTelemetryData.material
		};

		if(this.rawTelemetryData.project_name){

			this.printerStatus = this.PRINTER_STATUS_PRINTING;			

			this.telemetryPrinting = {
				projectName: this.rawTelemetryData.project_name,
				remainingTimeInSeconds: parseInt(this.rawTelemetryData.time_est),
				progressInPercentage: parseInt(this.rawTelemetryData.progress),
				currentHeight: parseFloat(this.rawTelemetryData.pos_z_mm)
			};
		} else {
			this.printerStatus = this.PRINTER_STATUS_IDLE;
		}
	}

	remainingPrintingTimeAsString(){
		var remainingPrintTimeDate = new Date(0);
		remainingPrintTimeDate.setSeconds(this.telemetryPrinting.remainingTimeInSeconds);
		return remainingPrintTimeDate.toISOString().substr(11, 5);
	}

	printingEndTimestampAsString(){
		let currentTimeInSeconds = Math.floor(new Date().getTime() / 1000);

		let secondsTillEnd = currentTimeInSeconds + this.telemetryPrinting.remainingTimeInSeconds;
		console.log(secondsTillEnd);
		var finalPrintingTimeDate = new Date(0);
		finalPrintingTimeDate.setSeconds(secondsTillEnd);

		console.log(new DateFormatter().string(finalPrintingTimeDate));
		
		return toLocal(finalPrintingTimeDate);
	}
	
	static isIpAddressValid(inputIp){
		return (inputIp.match("^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$")) ? true : false;
	}

}

class PrinterWidget{

	widget = null;
	printer = null;
	headerStack = null;
	contentStack = null;
	footerStack = null;

	constructor(printer){
  		console.log("Construct Widget");
  		this.printer = printer;
		this.widget = new ListWidget();
		this.widget.url = printer.printerUrl;


		this.headerStack = this.widget.addStack();
		this.widget.addSpacer(null);
		this.contentStack = this.widget.addStack();
		this.contentStack.layoutVertically();
		this.widget.addSpacer(null);
		this.footerStack = this.widget.addStack();
		this.widget.addSpacer(null);		

  		console.log("Fill Widget");
		this.fillHeader();
		this.fillContent();
		this.fillFooter();

		this.widget.presentMedium();
	}

	fillHeader(){
  		let headerText = "Prusa Connect local" 
  		+ (this.printer.printerType ? " - " + this.printer.printerType : "");
		let headerTextWidget = this.headerStack.addText(headerText);
		headerTextWidget.font = title_font;
		headerTextWidget.textColor = new Color('#f58a42');
	}


	fillContent(){
  
  		console.log(this.printer.printerStatus);
  
  		if(this.printer.printerStatus 
  					=== this.printer.PRINTER_STATUS_INVALIDIP){

			this.setWidgetRefreshTimeInMinutes(30);	

  			let ipAddressInvalidText = "Invalid IP address";
  			let offlineExplanationText = "provide IP address as Parameter";

  			let ipAddressInvalidTextWidget = this.contentStack.addText(ipAddressInvalidText);
  			let offlineExplanationTextWidget = this.contentStack.addText(offlineExplanationText);
  	
  			ipAddressInvalidTextWidget.font = STYLING.FONTS.CONTENT_BOLD;
  			offlineExplanationTextWidget.font = STYLING.FONTS.CONTENT_HINT;
  			offlineExplanationTextWidget.textColor = STYLING.COLORS.HINT_GREY;
  
  			
  		} else if(this.printer.printerStatus 
  					=== this.printer.PRINTER_STATUS_NOTAVAILABLE){

			this.setWidgetRefreshTimeInMinutes(30);	

  			let printerNotAvailableText = "Printer is OFFLINE";
  			let offlineExplanationText = "turn on printer, check for local network or check IP address";

  			let printerNotAvailableTextWidget = this.contentStack.addText(printerNotAvailableText);
  			let offlineExplanationTextWidget = this.contentStack.addText(offlineExplanationText);
  	
  			printerNotAvailableTextWidget.font = STYLING.FONTS.CONTENT_BOLD;
  			offlineExplanationTextWidget.font = STYLING.FONTS.CONTENT_HINT;
  			offlineExplanationTextWidget.textColor = STYLING.COLORS.HINT_GREY;  			
  		} else if(this.printer.printerStatus === this.printer.PRINTER_STATUS_IDLE){
    		
    		this.setWidgetRefreshTimeInMinutes(10);
    
    		this.contentStack.layoutVertically();

  			let printerIdleText = "Printer is IDLE";
  			let printerIdleTextWidget = this.contentStack.addText(printerIdleText);
  			printerIdleTextWidget.font = STYLING.FONTS.CONTENT_BOLD;
  			
    		
    		this.addingTemperatureAndMaterialText(this.contentStack);		
    
    	} else if(this.printer.printerStatus === this.printer.PRINTER_STATUS_PRINTING){
			
			this.setWidgetRefreshTimeInMinutes(1);			
			this.contentStack.layoutVertically();

  			let printingTitleText = "Printing: " 
  					+ this.printer.telemetryPrinting.projectName.substr(0,20) + "...";
			let printingTitleTextWidget = this.contentStack.addText(printingTitleText);
  			printingTitleTextWidget.font = STYLING.FONTS.CONTENT_BOLD;
  			
  			this.contentStack.addSpacer(null);
  
  			let detailStack = this.contentStack.addStack();
  			
  			let pictureStack = detailStack.addStack();
  			detailStack.addSpacer(null);
  			let printingStateStack = detailStack.addStack();
  			printingStateStack.layoutVertically();
  
  			
  			pictureStack.addImage(
				generatedProgressPie(this.printer.telemetryPrinting.progressInPercentage, 300));
  
  			let printingProgressText = 
  				+ this.printer.telemetryPrinting.progressInPercentage + " % - remain: " 
  				+ this.printer.remainingPrintingTimeAsString() + " h - Height: " 
  				+ this.printer.telemetryPrinting.currentHeight + " mm"

			let printingProgressTextWidget = printingStateStack.addText(printingProgressText);
			printingProgressTextWidget.font = STYLING.FONTS.CONTENT;
      		this.addingTemperatureAndMaterialText(printingStateStack);
      
          	let estimatedFinishText = "Est. Finish: " + this.printer.printingEndTimestampAsString();
			let estimatedFinishTextWidget = printingStateStack.addText(estimatedFinishText);
			estimatedFinishTextWidget.font = STYLING.FONTS.CONTENT_SMALL_BOLD;    
  		}
		
	}
	
	fillFooter(){
		let footerText = "Last updated: " + toLocal(this.printer.commonData.latestUpdate);
		let footerTextWidget = this.footerStack.addText(footerText);
		footerTextWidget.font = footer_font;	
	}

	addingTemperatureAndMaterialText(stack){
		let tempAndMaterialText = "Nozzle: " 
			+ this.printer.telemetryGeneral.temperatureNozzle + "° - Bed: " 
			+ this.printer.telemetryGeneral.temperatureBed + "° - Material: " 
			+ this.printer.telemetryGeneral.material;
		let tempAndMaterialTextWidget = stack.addText(tempAndMaterialText);
		tempAndMaterialTextWidget.font = STYLING.FONTS.CONTENT;
	}

	setWidgetRefreshTimeInMinutes(minutes){

		let refreshDate = new Date(0);
		refreshDate.setSeconds(Math.floor(this.printer.commonData.latestUpdate.getTime() / 1000) 
			+ (60 * minutes));
		this.widget.refreshAfterDate = refreshDate;
	}

}


main();


async function main(){
  
  	let widgetInputRAW = args.widgetParameter;
	let printerIP = null;
	let printerApiUrl = "";


	if (widgetInputRAW == null) {
  		widgetInputRAW = "192.168.178.42";
	}
  
	printerIp = widgetInputRAW.toString();


	let printer = new PrusaPrinter(printerIp);

	if(!printer.printerStatus){
		await printer.loadRemoteTelemetryData();
	}

	let printerWidget = new PrinterWidget(printer);

	Script.setWidget(printerWidget.widget);
	Script.complete();

}

function toLocal(date) {
  console.log(date);
  var local = new Date(date);
  console.log(local);
  local.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return local.toJSON().substr(0,19);
}


// functions for image generation

function generatedProgressPie(progressInPercentage, width){

	const OFFSET = 1;

	let drawingCanvas = new DrawContext();
	drawingCanvas.opaque = false;

	drawingCanvas.size = new Size(width, width);

	drawingCanvas.setLineWidth(15);
	drawingCanvas.setStrokeColor(STYLING.COLORS.IMAGE);
	drawingCanvas.setFillColor(STYLING.COLORS.IMAGE);

	
	let rectangleOutline = new Rect(0 + OFFSET, 0 + OFFSET, drawingCanvas.size.width - OFFSET, drawingCanvas.size.height - OFFSET);
	drawingCanvas.strokeEllipse(rectangleOutline);
	

	let partialCirclePathPoints = generatePointsOnCircleForAngle(Math.floor(drawingCanvas.size.width / 2), Math.floor(drawingCanvas.size.height / 2), Math.floor(rectangleOutline.size.width / 2), Math.round(360 / 100 * progressInPercentage));	

	let partialCirclePath = new Path();
	partialCirclePath.addLines(partialCirclePathPoints);
	drawingCanvas.addPath(partialCirclePath);
	drawingCanvas.fillPath();


	return drawingCanvas.getImage();
}



function generatePointsOnCircleForAngle(midX, midY, radius, angle){
  
  let pathPoints = [];
  pathPoints.push(new Point(midX, midY));
  
  for(i = angle + 180; i >= 0 + 180; i--){
  	let circlePointY = Math.round(midY + radius * Math.cos(calculateRadianForAngle(-i)));
	let circlePointX = Math.round(midX + radius * Math.sin(calculateRadianForAngle(-i)));
	pathPoints.push(new Point(circlePointX, circlePointY));
	}
  
  pathPoints.push(new Point(midX, midY));
  return pathPoints;
  
}

function calculateRadianForAngle(angle){
	return Math.PI * 2 * angle / 360;
}