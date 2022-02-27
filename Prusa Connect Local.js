/************************************************************************
Widget to show 3D printer details supported by Prusa Connect local API

Setup:
- copy widget to scriptable
- add scriptable widget (medium size) to homescreen
- widget config:
	- Script: choose script
	- When interacting (propsal): Run Script
	- Parameter: ip address to prusa printer

to analyse:
- script is starting with main() after class definitions

*/

class PrusaPrinter{

	// Constants  
	static API_PATH = "/api/telemetry";
  	static STATUS = {
  		INVALIDIP: "INVALID_IP",
		NOTAVAILABLE: "NA",
		IDLE: "IDLE",
		PRINTING: "PRINTING"
  	};

	
	// Members - Printer Data
	commonData = {
  		ip: null,
  		url: null,
  		status: null,
  		type: null,
  		latestUpdate: new Date()
	};
	
	// Members - Telemetry Data general
	rawTelemetryData = {};
	telemetryGeneral = {
  		dataRetrievalDate: null,
		temperatureNozzle: 0,
		temperatureBed: 0,
		material: null
		
	}

	// Members - Telemtry Data printing
	telemetryPrinting = {
		projectName: null,
		remainingTimeInSeconds: 0,
		progressInPercentage: 0,
		currentHeight: 0.0
	};

	constructor(printerIp){	
  		if(!PrusaPrinter.isIpAddressValid(printerIp)){
			this.commonData.status = PrusaPrinter.STATUS.INVALIDIP;
			console.log(this.commonData.status);
			return;
  		}
		
		this.commonData.ip = printerIp;
		this.commonData.url = "http://" + printerIp;
		console.log(this.commonData.ip + " " + this.commonData.url);
	}

	async loadRemoteTelemetryData(printer){
  
  		let request = new Request(this.commonData.url + PrusaPrinter.API_PATH);
		request.timeoutInterval = 5;

		try {
			let data = await request.loadJSON();
		
			if(request.response && request.response.statusCode == 200){
  				this.commonData.type = request.response.headers.Server;
  				console.log(data);
				this.rawTelemetryData = data;
				this.parseTelemetryRawDataAndSetPrinterStatus();
			}
			
		} catch(e) {
			this.commonData.status = PrusaPrinter.STATUS.NOTAVAILABLE;
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

			this.commonData.status = PrusaPrinter.STATUS.PRINTING;			

			this.telemetryPrinting = {
				projectName: this.rawTelemetryData.project_name,
				remainingTimeInSeconds: parseInt(this.rawTelemetryData.time_est),
				progressInPercentage: parseInt(this.rawTelemetryData.progress),
				currentHeight: parseFloat(this.rawTelemetryData.pos_z_mm)
			};
		} else {
			this.commonData.status = PrusaPrinter.STATUS.IDLE;
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
		
		return dateToLocalizedString(finalPrintingTimeDate);
	}
	
	static isIpAddressValid(inputIp){
		return (inputIp.match("^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$")) ? true : false;
	}

}

class PrinterWidget{

	// Constants
	static STYLING = {
		FONTS: {
			HEADER: Font.heavyRoundedSystemFont(19),
			FOOTER: Font.regularRoundedSystemFont(13),
	
			CONTENT_TITLE_BOLD: Font.heavyRoundedSystemFont(17),
			CONTENT: Font.regularRoundedSystemFont(13),
			CONTENT_BOLD: Font.heavyRoundedSystemFont(13),
			CONTENT_HINT: Font.regularRoundedSystemFont(10)
		},
	
		COLORS: {
			PRUSA_ORANGE: new Color("#f58a42"),
			HINT_GREY: new Color("#999999"),
			IMAGE: Device.isUsingDarkAppearance() ? new Color("#03d3fc") : new Color("#0000ff")
		},
	
		DYNAMIC_SPACER_SIZE: null
	};

	static REFRESHRATE = {
		PRINTING: 1,
		IDLE: 10,
		OFFLINE: 20
	}


	// Members
	widget = null;
	printer = null;

	stack = {
		header: null,
		content: null,
		footer: null
	}
	
	constructor(printer){
  		console.log("Construct Widget");
  		this.printer = printer;
		this.widget = new ListWidget();
		this.widget.url = printer.commonData.url;


		this.stack.header = this.widget.addStack();
		this.widget.addSpacer(PrinterWidget.STYLING.DYNAMIC_SPACER_SIZE);
		this.stack.content = this.widget.addStack();
		this.stack.content.layoutVertically();
		this.widget.addSpacer(PrinterWidget.STYLING.DYNAMIC_SPACER_SIZE);
		this.stack.footer = this.widget.addStack();
		this.widget.addSpacer(PrinterWidget.STYLING.DYNAMIC_SPACER_SIZE);		

  		console.log("Fill Widget");
		this.fillHeader();
		this.fillContent();
		this.fillFooter();

		this.widget.presentMedium();
	}

	fillHeader(){
  		let headerText = "Prusa Connect local" 
  		+ (this.printer.commonData.type ? " - " + this.printer.commonData.type : "");
		let headerTextWidget = this.stack.header.addText(headerText);
		headerTextWidget.font = PrinterWidget.STYLING.FONTS.HEADER;
		headerTextWidget.textColor = new Color('#f58a42');
	}


	fillContent(){
  
  		console.log(this.printer.commonData.status);
  
  		if(this.printer.commonData.status 
  					=== PrusaPrinter.STATUS.INVALIDIP){

			this.setWidgetRefreshTimeInMinutes(PrinterWidget.REFRESHRATE.OFFLINE);	

  			let ipAddressInvalidText = "Invalid IP address";
  			let offlineExplanationText = "provide IP address as Parameter";

  			let ipAddressInvalidTextWidget = this.stack.content.addText(ipAddressInvalidText);
  			let offlineExplanationTextWidget = this.stack.content.addText(offlineExplanationText);
  	
  			ipAddressInvalidTextWidget.font = PrinterWidget.STYLING.FONTS.CONTENT_BOLD;
  			offlineExplanationTextWidget.font = PrinterWidget.STYLING.FONTS.CONTENT_HINT;
  			offlineExplanationTextWidget.textColor = PrinterWidget.STYLING.COLORS.HINT_GREY;
  
  			
  		} else if(this.printer.commonData.status 
  					=== PrusaPrinter.STATUS.NOTAVAILABLE){

			this.setWidgetRefreshTimeInMinutes(PrinterWidget.REFRESHRATE.OFFLINE);	

  			let printerNotAvailableText = "Printer is OFFLINE";
  			let offlineExplanationText = "turn on printer, check for local network or check IP address";

  			let printerNotAvailableTextWidget = this.stack.content.addText(printerNotAvailableText);
  			let offlineExplanationTextWidget = this.stack.content.addText(offlineExplanationText);
  	
  			printerNotAvailableTextWidget.font = PrinterWidget.STYLING.FONTS.CONTENT_BOLD;
  			offlineExplanationTextWidget.font = PrinterWidget.STYLING.FONTS.CONTENT_HINT;
  			offlineExplanationTextWidget.textColor = PrinterWidget.STYLING.COLORS.HINT_GREY;  		

  		} else if(this.printer.commonData.status === PrusaPrinter.STATUS.IDLE){
    		
    		this.setWidgetRefreshTimeInMinutes(PrinterWidget.REFRESHRATE.IDLE);
    
    		this.stack.content.layoutVertically();

  			let printerIdleText = "Printer is IDLE";
  			let printerIdleTextWidget = this.stack.content.addText(printerIdleText);
  			printerIdleTextWidget.font = PrinterWidget.STYLING.FONTS.CONTENT_BOLD;
  			
    		
    		this.addingTemperatureAndMaterialText(this.stack.content);		
    
    	} else if(this.printer.commonData.status === PrusaPrinter.STATUS.PRINTING){
			
			this.setWidgetRefreshTimeInMinutes(PrinterWidget.REFRESHRATE.OFFLINE.PRINTING);			
			this.stack.content.layoutVertically();

  			let printingTitleText = "Printing: " 
  					+ this.printer.telemetryPrinting.projectName.substr(0,20) + "...";
			let printingTitleTextWidget = this.stack.content.addText(printingTitleText);
  			printingTitleTextWidget.font = PrinterWidget.STYLING.FONTS.CONTENT_BOLD;
  			
  			this.stack.content.addSpacer(PrinterWidget.STYLING.DYNAMIC_SPACER_SIZE);
  
  			let detailStack = this.stack.content.addStack();
  			
  			let pictureStack = detailStack.addStack();
  			detailStack.addSpacer(PrinterWidget.STYLING.DYNAMIC_SPACER_SIZE);
  			let printingStateStack = detailStack.addStack();
  			printingStateStack.layoutVertically();
  
  			
  			pictureStack.addImage(
				generatedProgressPie(this.printer.telemetryPrinting.progressInPercentage, 300));
  
  			let printingProgressText = 
  				+ this.printer.telemetryPrinting.progressInPercentage + " % - remain: " 
  				+ this.printer.remainingPrintingTimeAsString() + " h - Height: " 
  				+ this.printer.telemetryPrinting.currentHeight + " mm"

			let printingProgressTextWidget = printingStateStack.addText(printingProgressText);
			printingProgressTextWidget.font = PrinterWidget.STYLING.FONTS.CONTENT;
      		this.addingTemperatureAndMaterialText(printingStateStack);
      
          	let estimatedFinishText = "Est. Finish: " + this.printer.printingEndTimestampAsString();
			let estimatedFinishTextWidget = printingStateStack.addText(estimatedFinishText);
			estimatedFinishTextWidget.font = PrinterWidget.STYLING.FONTS.CONTENT_BOLD;    
  		}
		
	}
	
	fillFooter(){
		let footerText = "Last updated: " + dateToLocalizedString(this.printer.commonData.latestUpdate);
		let footerTextWidget = this.stack.footer.addText(footerText);
		footerTextWidget.font = PrinterWidget.STYLING.FONTS.FOOTER;	
	}

	addingTemperatureAndMaterialText(stack){
		let tempAndMaterialText = "Nozzle: " 
			+ this.printer.telemetryGeneral.temperatureNozzle + "° - Bed: " 
			+ this.printer.telemetryGeneral.temperatureBed + "° - Material: " 
			+ this.printer.telemetryGeneral.material;
		let tempAndMaterialTextWidget = stack.addText(tempAndMaterialText);
		tempAndMaterialTextWidget.font = PrinterWidget.STYLING.FONTS.CONTENT;
	}

	setWidgetRefreshTimeInMinutes(minutes){

		let refreshDate = new Date(0);
		refreshDate.setSeconds(Math.floor(this.printer.commonData.latestUpdate.getTime() / 1000) 
			+ (60 * minutes));
		this.widget.refreshAfterDate = refreshDate;
	}

}


// start script
main();


async function main(){
  
  	let widgetInputRAW = args.widgetParameter;
	    
	let printerIp = widgetInputRaw ? widgetInputRAW.toString() : "";


	let printer = new PrusaPrinter(printerIp);

	if(!printer.commonData.status){
		await printer.loadRemoteTelemetryData();
	}

	let printerWidget = new PrinterWidget(printer);

	Script.setWidget(printerWidget.widget);
	Script.complete();

}

function dateToLocalizedString(date) {
  console.log(date);
  var local = new Date(date);
  console.log(local);
  local.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return local.toJSON().substr(0,19);
}


// functions for image generation

function generatedProgressPie(progressInPercentage, width){

	const OFFSET = 1;
	const STROKE_STRENGTH = 15;

	let drawingCanvas = new DrawContext();

	// transparency for Darkmode
	drawingCanvas.opaque = false;

	drawingCanvas.size = new Size(width, width);

	drawingCanvas.setLineWidth(STROKE_STRENGTH);
	drawingCanvas.setStrokeColor(PrinterWidget.STYLING.COLORS.IMAGE);
	drawingCanvas.setFillColor(PrinterWidget.STYLING.COLORS.IMAGE);

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