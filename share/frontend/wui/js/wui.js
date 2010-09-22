/*****************************************************************************
 *
 * wui.js - Functions which are used by the WUI
 *
 * Copyright (c) 2004-2010 NagVis Project (Contact: info@nagvis.org)
 *
 * License:
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 2 as
 * published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 675 Mass Ave, Cambridge, MA 02139, USA.
 *
 *****************************************************************************/
 
/**
 * @author	Lars Michelsen <lars@vertical-visions.de>
 */
 
var cpt_clicks = 0;
var coords = '';
var objtype = '';
var follow_mouse = false;
var action_click = "";
var myshape = null;
var myshape_background = null;
var myshapex = 0;
var myshapey = 0;
var objid = -1;
var viewType = '';

/************************************************
 * Register events
 *************************************************/

// First firefox and the IE
if (window.addEventListener) {
  window.addEventListener("mousemove", function(e) {
    track_mouse(e);
    dragObject(e);
    return false;
  }, false);
} else {
  document.documentElement.onmousemove  = function(e) {
    track_mouse(e);
    dragObject(e);
    return false;
  };
}

/**
 * Toggle the grid state in the current view and sends
 * current setting to server component for persistance
 *
 * @author  Lars Michelsen <lars@vertical-visions.de>
 */
function gridToggle() {
	// Toggle the grid state
	if(oViewProperties.grid_show === 1) {
		oViewProperties.grid_show = 0;
		
		// Remove from view
		var oMap = document.getElementById('mymap');
		var oGrid = document.getElementById('grid');
		oMap.removeChild(oGrid);
		oGrid = null;
		oMap = null;
	} else {
		oViewProperties.grid_show = 1;
		
		// Add to view
		gridParse();
	}
	
	// Send current option to server component
	var url = oGeneralProperties.path_server+'?mod=Map&act=modifyObject&map='+mapname+'&type=global&id=0&grid_show='+oViewProperties.grid_show;
	
	// Sync ajax request
	var oResult = getSyncRequest(url);
	if(oResult && oResult.status != 'OK') {
		alert(oResult.message);
	}
	
	oResult = null;
}

/**
 * Parses a grind to make the alignment of the icons easier
 *
 * @author  Lars Michelsen <lars@vertical-visions.de>
 */
function gridParse() {
	// Only show when user configured to see a grid
	if(oViewProperties.grid_show === 1) {
		// Create grid container and append to map
		var oMap = document.getElementById('mymap');
		var oGrid = document.createElement('div');
		oGrid.setAttribute('id', 'grid');
		oMap.appendChild(oGrid);
		oGrid = null;
		oMap = null;
		
		// Add an options: grid_show, grid_steps, grid_color
		var grid = new jsGraphics('grid');
		grid.setColor(oViewProperties.grid_color);
		grid.setStroke(1);
		
		var gridStep = oViewProperties.grid_steps;
		
		// Start
		var gridYStart = 0;
		var gridXStart = 0;
		
		// End: Get screen height, width
		var gridYEnd = pageHeight() - getHeaderHeight();
		var gridXEnd = pageWidth();
		
		// Draw vertical lines
		for(var gridX = gridStep; gridX < gridXEnd; gridX = gridX + gridStep) {
			grid.drawLine(gridX, gridYStart, gridX, gridYEnd);
		}
		// Draw horizontal lines
		for(var gridY = gridStep; gridY < gridYEnd; gridY = gridY + gridStep) {
			grid.drawLine(gridXStart, gridY, gridXEnd, gridY);
		}
		
		grid.paint();
		
		gridXEnd = null
		gridYEnd = null;
		gridXStart = null;
		gridYStart = null;
		gridStep = null;
		grid = null;
	}
}

/**
 * validateValue(oField)
 *
 * This function checks a string for valid format. The check is done by the
 * given regex.
 *
 * @author	Lars Michelsen <lars@vertical-visions.de>
 */
function validateValue(sName, sValue, sRegex) {
	// Remove PHP delimiters
	sRegex = sRegex.replace(/^\//, "");
	sRegex = sRegex.replace(/\/[iugm]*$/, "");
	
	// Match the current value
	var regex = new RegExp(sRegex, "i");
	var match = regex.exec(sValue);
	if(sValue == '' || match != null) {
		return true;
	} else {
		alert(printLang(lang['wrongValueFormatOption'],'ATTRIBUTE~'+sName));
		return false;
	}
}

// functions used to track the mouse movements, when the user is adding an object. Draw a line a rectangle following the mouse
// when the user has defined enough points we open the "add object" window
function get_click(newtype,nbclicks,action) {
	coords = '';
	action_click = action;
	objtype = newtype;
	
	// we init the number of points coordinates we're going to wait for before we display the add object window
	cpt_clicks=nbclicks;
	
	if(document.images['background']) {
		document.images['background'].style.cursor = 'crosshair';
	}
	
	document.onclick = get_click_pos;
}

function printLang(sLang,sReplace) {
	if(typeof sLang === 'undefined')
		return '';
	
	sLang = sLang.replace(/<(\/|)(i|b)>/ig,'');
	
	// sReplace maybe optional
	if(typeof sReplace != "undefined") {
		aReplace = sReplace.split(",")
		for(var i = 0; i < aReplace.length; i++) {
			var aReplaceSplit = aReplace[i].split("~");
			sLang = sLang.replace("["+aReplaceSplit[0]+"]",aReplaceSplit[1]);
		}
	}
	
	return sLang;
}

function track_mouse(e) {
	if(follow_mouse) {
		var event;
		if(!e) {
			event = window.event;
		} else {
			event = e;
		}
		
		if (event.pageX || event.pageY) {
			posx = event.pageX;
			posy = event.pageY;
		} else if (event.clientX || event.clientY) {
			posx = event.clientX;
			posy = event.clientY;
		}
		
		// Substract height of header menu here
		posy -= getHeaderHeight();
		
		myshape.clear();
		
		if(objtype != 'textbox') {
			myshape.drawLine(myshapex, myshapey, posx, posy);
		} else {
			myshape.drawRect(myshapex, myshapey, (posx - myshapex), (posy - myshapey));
		}
		
		myshape.paint();
	}
	
	return true;
}

function get_click_pos(e) {
	if(cpt_clicks > 0) {
		var posx = 0;
		var posy = 0;
		
		var event;
		if(!e) {
			event = window.event;
		} else {
			event = e;
		}
	
		if (event.pageX || event.pageY) {
			posx = event.pageX;
			posy = event.pageY;
		}
		else if (event.clientX || event.clientY) {
			posx = event.clientX;
			posy = event.clientY;
		}

		// FIXME: Check the clicked area. Only handle clicks on the map!
		
		// Substract height of header menu here
		posy -= getHeaderHeight();
		
		// Start drawing a line
		if(cpt_clicks == 2) {		
			myshape = new jsGraphics("mymap");
			myshapex = posx;
			// Substract height of header menu here
			myshapey = posy;
			
			myshape.setColor('#06B606');
			myshape.setStroke(1);
			
			follow_mouse = true;
			
			// Save view_type for default selection in addmodify dialog
			viewType = 'line';
		}
		
		if(viewType == '') {
			viewType = 'icon';
		}
		
		// When a grid is enabled align the dragged object in the nearest grid
		if(oViewProperties.grid_show === 1) {
			var aCoords = coordsToGrid(posx, posy);
			posx = aCoords[0];
			posy = aCoords[1];
		}
		
		// Save current click position
		coords = coords + posx + ',' + posy + ',';
		
		// Reduce number of clicks left
		cpt_clicks = cpt_clicks - 1;
	}
	
	if(cpt_clicks == 0) {
		if(follow_mouse) {
			myshape.clear();
		}
		
		coords = coords.substr(0, coords.length-1);
		
		if(document.images['background']) {
			document.images['background'].style.cursor = 'default';
		}
		
		follow_mouse = false;
		var sUrl;
		if(action_click == 'add' || action_click == 'clone') {
			sUrl = oGeneralProperties.path_server+'?mod=Map&act=addModify&do=add&show='+mapname+'&type='+objtype+'&coords='+coords+'&viewType='+viewType;
			
			if(action_click == 'clone' && objid !== -1) {
				sUrl += '&clone='+objid;
			}
		} else if(action_click == 'modify' && objid !== -1) {
			sUrl = oGeneralProperties.path_server+'?mod=Map&act=addModify&do=modify&show='+mapname+'&type='+objtype+'&id='+objid+'&coords='+coords;
		}
		
		showFrontendDialog(sUrl, printLang(lang['properties'], ''));
		
		objid = -1;
		cpt_clicks = -1;
	}	
}

function saveObjectAfterResize(oObj) {
	// Split id to get object information
	var arr = oObj.id.split('_');
	
	var type = arr[1];
	var id = arr[2];
	
	var objX = parseInt(oObj.style.left.replace('px', ''));
	var objY = parseInt(oObj.style.top.replace('px', ''));
	var objW = parseInt(oObj.style.width);
	var objH = parseInt(oObj.style.height);
	
	// Don't forget to substract height of header menu
	var url = oGeneralProperties.path_server+'?mod=Map&act=modifyObject&map='+mapname+'&type='+type+'&id='+id+'&x='+objX+'&y='+objY+'&w='+objW+'&h='+objH;
	
	// Sync ajax request
	var oResult = getSyncRequest(url);
	if(oResult && oResult.status != 'OK') {
		alert(oResult.message);
	}
	
	oResult = null;
}

function coordsToGrid(x, y) {
	var gridMoveX = x - (x % oViewProperties.grid_steps);
	var gridMoveY = y - (y % oViewProperties.grid_steps);
	return [ gridMoveX, gridMoveY ];
}

function saveObjectAfterMoveAndDrop(oObj) {
	// Split id to get object information
	var arr = oObj.id.split('_');

	var borderWidth = 3;
	if(arr[1] == 'label' || arr[1] == 'textbox')
			borderWidth = 0;
	
	// When a grid is enabled align the dragged object in the nearest grid
	if(oViewProperties.grid_show === 1) {
		var coords = coordsToGrid(oObj.x + borderWidth, oObj.y + borderWidth);
		oObj.x = (coords[0] - borderWidth);
		oObj.y = (coords[1] - borderWidth);
		oObj.style.top  = oObj.y + 'px';
		oObj.style.left = oObj.x + 'px';
		moveRelativeObject(oObj.id, oObj.y, oObj.x);
	}
	
	// Handle different ojects (Normal icons and labels)
	var type, id , url;
	if(arr[1] === 'label') {
		var align = arr[0];
		type = arr[2];
		id = arr[3];
		var x, y;
		
		// Handle relative and absolute aligned labels
		if(align === 'rel') {
			// Calculate relative coordinates
			var objX = parseInt(document.getElementById('box_'+type+'_'+id).style.left.replace('px', ''));
			var objY = parseInt(document.getElementById('box_'+type+'_'+id).style.top.replace('px', ''));
			
			// Substract height of header menu here
			objY += getHeaderHeight();
			
			// +3: Is the borderWidth of the object highlighting
			x = oObj.x - objX + borderWidth;
			y = oObj.y - objY + borderWidth;
			
			// Add + sign to mark relative positive coords (On negative relative coord
			// the - sign is added automaticaly
			if(x >= 0) {
				// %2B is escaped +
				x = '%2B'+x;
			}
			if(y >= 0) {
				// %2B is escaped +
				y = '%2B'+y;
			}
		} else {
			x = oObj.x;
			// Substract height of header menu here
			y = oObj.y;
		}
		
		url = oGeneralProperties.path_server+'?mod=Map&act=modifyObject&map='+mapname+'&type='+type+'&id='+id+'&label_x='+x+'&label_y='+y;
	} else {
		type = arr[1];
		id = arr[2];

		// +3: Is the borderWidth of the object highlighting
		x = oObj.x + borderWidth;
		y = oObj.y + borderWidth;

		// Don't forget to substract height of header menu
		url = oGeneralProperties.path_server+'?mod=Map&act=modifyObject&map='+mapname+'&type='+type+'&id='+id+'&x='+x+'&y='+y;
	}
	
	// Sync ajax request
	var oResult = getSyncRequest(url);
	if(oResult && oResult.status != 'OK') {
		alert(oResult.message);
	}
	oResult = null;
}

// This function handles object deletions on maps
function deleteMapObject(objId) {
	if(confirm(printLang(lang['confirmDelete'],''))) {
		var arr = objId.split('_');
		var map = mapname;
		var type = arr[1];
		var id = arr[2];
		
		// Sync ajax request
		var oResult = getSyncRequest(oGeneralProperties.path_server+'?mod=Map&act=deleteObject&map='+map+'&type='+type+'&id='+id);
		if(oResult && oResult.status != 'OK') {
			alert(oResult.message);
			return false;
		}
		oResult = null;

		// Remove the object with all childs and other containers from the map
		var oMap = document.getElementById('mymap');
		var ids = [ objId, 'icon_'+type+'_'+id+'-context', 'rel_label_'+type+'_'+id, 'abs_label_'+type+'_'+id ];
		for(var i in ids) {
			var o = document.getElementById(ids[i])
			if(o) {
				oMap.removeChild(o);
				o = null;
			}
		}
		oMap = null;
		
		return true;
	} else {
		return false;
	}
}

/**
 * formSubmit()
 *
 * Submits the form contents to the ajax handler by a synchronous HTTP-GET
 *
 * @param   String   ID of the form
 * @param   String   Action to send to the ajax handler
 * @return  Boolean  
 * @author	Lars Michelsen <lars@vertical-visions.de>
 */
function formSubmit(formId, target, bReloadPage) {
	if(typeof bReloadPage === 'undefined') {
		bReloadPage = true;
	}
	
	// Read form contents
	var getstr = getFormParams(formId);
	
	// Submit data
	var oResult = getSyncRequest(target+'&'+getstr);
	if(oResult && oResult.status != 'OK') {
		alert(oResult.message);
		return false;
	}
	oResult = null;
	
	// Close form
	popupWindowClose();
	
	// FIXME: Reloading the map (Change to reload object)
	if(bReloadPage === true) {
		document.location.href='./index.php?mod=Map&act=edit&show='+mapname;
	}
}

/**
 * toggleDefaultOption
 *
 * This function checks the value of the field to reset it to the default value
 * which is stored in a "helper field". The default value is inserted when there
 * is no option given in the current object.
 *
 * @author	Lars Michelsen <lars@vertical-visions.de>
 */
function toggleDefaultOption(sName, bOverrideCurrentValue) {
	var oField = document.getElementById(sName);
	var oFieldDefault = document.getElementById('_'+sName);
	
	if(typeof bOverrideCurrentValue === 'undefined') {
		bOverrideCurrentValue = false;
	}
	
	if(oField && oFieldDefault) {
		// Set option only when the field is emtpy and the default value has a value
		// Added override flag to ignore the current value
		if((bOverrideCurrentValue === true || (bOverrideCurrentValue === false && oField.value === '')) && oFieldDefault.value !== '') {
			// Set value to default value
			oField.value = oFieldDefault.value;
			
			// Visualize the default value
			oField.style.color = '#B0A8B8';
		} else if(oField.value != oFieldDefault.value) {
			// Reset the visualisation
			oField.style.color = '';
		} else if(oField.value == oFieldDefault.value) {
			// Visualize the default value
			oField.style.color = '#B0A8B8';
		}
	}
	
	oFieldDefault = null;
	oField = null;
}

/**
 * validateMainConfigFieldValue(oField)
 *
 * This function checks a config field value for valid format. The check is done
 * by the match regex from validMapConfig array.
 *
 * @author	Lars Michelsen <lars@vertical-visions.de>
 */
function validateMainConfigFieldValue(oField) {
	var sName = oField.name.split('_');
	return validateValue(sName, oField.value, validMainConfig[sName[0]][sName[1]].match);
}

/**
 * toggleDependingFields
 *
 * This function shows/hides the fields which depend on the changed field
 *
 * @author	Lars Michelsen <lars@vertical-visions.de>
 */
function toggleDependingFields(formName, name, value) {
	var aFields = document.getElementById(formName).elements;
	
	for(var i = 0, len = aFields.length; i < len; i++) {
		// Filter helper fields
		if(aFields[i].name.charAt(0) !== '_') {
			if(aFields[i].type != 'hidden' && aFields[i].type != 'submit') {
				// Handle different structures of main cfg and map cfg editing
				var oConfig, sMasterName, sTypeName, sOptName, sFieldName;
				if(formName == 'edit_config') {
					sMasterName = name.replace(sTypeName+'_', '');
					sTypeName = aFields[i].name.split('_')[0];
					sOptName = aFields[i].name.replace(sTypeName+'_', '');
					sFieldName = aFields[i].name;
					oConfig = validMainConfig;
				} else {
					sMasterName = name;
					sTypeName = document.getElementById(formName).type.value;
					sOptName = aFields[i].name;
					oConfig = validMapConfig;
				}
				
				var sFieldName = aFields[i].name;
				
				// Show option fields when parent field value is equal and hide when 
				// parent field value differs
				if(oConfig[sTypeName] && oConfig[sTypeName][sOptName]['depends_on'] === sMasterName
					 && oConfig[sTypeName][sOptName]['depends_value'] != value) {
					
					document.getElementById(sFieldName).parentNode.parentNode.style.display = 'none';
					document.getElementById(sFieldName).value = '';
				} else if(oConfig[sTypeName] && oConfig[sTypeName][sOptName]['depends_on'] === sMasterName
					 && oConfig[sTypeName][sOptName]['depends_value'] == value) {
					
					document.getElementById(sFieldName).parentNode.parentNode.style.display = '';
					
					// Toggle the value of the field. If empty or just switched the function will
					// try to display the default value
					toggleDefaultOption(sFieldName);
				}
				if(!oConfig[sTypeName])
					alert('No data for type: '+sTypeName);
			}
		}
	}
	
	aFields = null;
}

/**
 * toggleFieldType
 *
 * Changes the field type from select to input and vice versa
 *
 * @author	Lars Michelsen <lars@vertical-visions.de>
 */
function toggleFieldType(sName, sValue) {
	var bReturn = false;
	var sBaseName;
	var bInputHelper = false;
	
	if(sName.indexOf('_inp_') !== -1) {
		sBaseName = sName.replace('_inp_', '');
		bInputHelper = true;
	} else {
		sBaseName = sName;
	}
	
	// Check if the field should be changed
	// this is toggled on
	// a) Select field set to "Manual Input..." or
	// b) Input helper field set to ""
	if((bInputHelper == false && sValue === lang['manualInput']) || (bInputHelper === true && sValue == '')) {
		var oSelectField = document.getElementById(sBaseName);
		var oInputField = document.getElementById('_inp_' + sBaseName);
		
		if(bInputHelper == false) {
			oSelectField.parentNode.parentNode.style.display = 'none';
			oInputField.parentNode.parentNode.style.display = '';
		} else {
			oSelectField.parentNode.parentNode.style.display = '';
			oInputField.parentNode.parentNode.style.display = 'none';
		}
		
		oInputField = null;
		oSelectField = null;
		
		bReturn = true;
	}
	
	return bReturn;
}

/**
 * toggleBorder()
 *
 * Highlights an object by show/hide a border around the icon
 *
 * @param   Object   Object to draw the border arround
 * @param   Integer  Enable/Disabled border
 * @author	Lars Michelsen <lars@vertical-visions.de>
 */
function toggleBorder(oObj, state){
	var sColor = '#dddddd';
	var iWidth = 3;
	
	var oContainer = oObj.parentNode;

	var top = parseInt(oContainer.style.top.replace('px', ''));
	var left = parseInt(oContainer.style.left.replace('px', ''));

	if(state === 1) {
		oObj.style.border = iWidth + "px solid " + sColor;
		oContainer.style.top = (top - iWidth) + 'px';
		oContainer.style.left = (left - iWidth) + 'px';
	} else {
		oObj.style.border = "none";
		oContainer.style.top = (top + iWidth) + 'px';
		oContainer.style.left = (left + iWidth) + 'px';
	}
	
	oObj = null;
	oContainer = null;
}

/*** Handles the object dragging ***/

var draggingEnabled = true;
var draggingObject = null;
var dragObjectOffset = null;
var dragObjectPos = null;
var dragObjectStartPos = null;
var dragObjectChilds = {};

function getTarget(event) {
	var target = event.target ? event.target : event.srcElement;
	while(target && target.tagName != 'DIV') {
		target = target.parentNode;
  }
	return target;
}

function getButton(event) {
	if (event.which == null)
		/* IE case */
		return (event.button < 2) ? "LEFT" : ((event.button == 4) ? "MIDDLE" : "RIGHT");
	else
		/* All others */
		return (event.which < 2) ? "LEFT" : ((event.which == 2) ? "MIDDLE" : "RIGHT");
}

function makeDragable(objects) {
	var len = objects.length;
	if(len == 0)
		return false;
	
	for(var i = 0; i < len; i++) {
		var o = document.getElementById(objects[i]);
		if(o) {
			addEvent(o, "mousedown", dragStart); 
			addEvent(o, "mouseup",   dragStop); 
			o = null;
		}
	}
	len = null;
}

function dragStart(event) {
	if(!event)
		event = window.event;
	
	var target = getTarget(event);
	var button = getButton(event);
	
	// Skip calls when already dragging or other button than left mouse
	if(draggingObject !== null || button != 'LEFT' || !draggingEnabled)
		return true;
	
	var posx, posy;
	if (event.pageX || event.pageY) {
		posx = event.pageX;
		posy = event.pageY;
	} else if (event.clientX || event.clientY) {
		posx = event.clientX;
		posy = event.clientY;
	}
	
	/*if(event.stopPropagation)
		event.stopPropagation();
	event.cancelBubble = true;*/
	
	draggingObject = target;
	
  // Save relative offset of the mouse to the snapin title to prevent flipping on drag start
  dragObjectOffset   = [ posy - draggingObject.offsetTop - getHeaderHeight(), 
                         posx - draggingObject.offsetLeft ];
  dragObjectStartPos = [ draggingObject.offsetTop, draggingObject.offsetLeft ];

	// Save diff coords of relative objects
	var sLabelName = target.id.replace('box_', 'rel_label_');
	var oLabel = document.getElementById(sLabelName);
	if(oLabel) {
		dragObjectChilds[sLabelName] = [ oLabel.offsetTop - draggingObject.offsetTop,
		                                 oLabel.offsetLeft - draggingObject.offsetLeft ];
		oLabel = null;
	}
	sLabelName = null;
	
	// Disable the default events for all the different browsers
	if(event.preventDefault)
		event.preventDefault();
	else
		event.returnValue = false;
	return true;
}

function dragObject(event) {
	if(!event)
		event = window.event;
	
	if(draggingObject === null || !draggingEnabled)
		return true;
	
	var posx, posy;
	if (event.pageX || event.pageY) {
		posx = event.pageX;
		posy = event.pageY;
	} else if (event.clientX || event.clientY) {
		posx = event.clientX;
		posy = event.clientY;
	}
	
	var newTop  = posy - dragObjectOffset[0] - getHeaderHeight();
	var newLeft = posx - dragObjectOffset[1];

  draggingObject.style.position = 'absolute';
	draggingObject.style.top  = newTop + 'px';
	draggingObject.style.left = newLeft + 'px';
	draggingObject.x = newLeft;
	draggingObject.y = newTop;

	// When this object has a relative coordinated label, then move this too
	moveRelativeObject(draggingObject.id, newTop, newLeft);
}

function moveRelativeObject(parentId, parentTop, parentLeft) {
	var sLabelName = parentId.replace('box_', 'rel_label_');
	if(typeof dragObjectChilds[sLabelName] !== 'undefined') {
		var oLabel = document.getElementById(sLabelName);
		if(oLabel) {
  		oLabel.style.position = 'absolute';
			oLabel.style.top  = (dragObjectChilds[sLabelName][0] + parentTop) + 'px';
			oLabel.style.left = (dragObjectChilds[sLabelName][1] + parentLeft) + 'px';
			oLabel = null;
		}
	}
	sLabelName = null;
}

function dragStop() {
	if(!draggingEnabled || !draggingObject)
		return;
	
	// When x or y are negative just return this and make no change
	if(draggingObject.y < 0 || draggingObject.x < 0) {
		draggingObject.style.top  = dragObjectStartPos[0] + 'px';
		draggingObject.style.left = dragObjectStartPos[1] + 'px';
		moveRelativeObject(draggingObject.id, dragObjectStartPos[0], dragObjectStartPos[1])
		draggingObject = null;
		return;
	}

	// Skip when the object has not been moved
	if(draggingObject.y == dragObjectStartPos[0] && draggingObject.x == dragObjectStartPos[1]) {
		draggingObject = null;
		return;
	}

	saveObjectAfterMoveAndDrop(draggingObject);
	
	draggingObject = null;
}
