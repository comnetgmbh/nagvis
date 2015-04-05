/*****************************************************************************
 *
 * ElementGadget.js - This class handles the visualisation of gadgets
 *
 * Copyright (c) 2004-2015 NagVis Project (Contact: info@nagvis.org)
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

var ElementGadget = Element.extend({
    gadget_type : null,

    render: function() {
        this.renderGadget();
        this.place();
    },

    place: function() {
        this.dom_obj.style.top  = this.obj.parseCoord(this.obj.conf.y, 'y') + 'px';
        this.dom_obj.style.left = this.obj.parseCoord(this.obj.conf.x, 'x') + 'px';
    },

    //
    // END OF PUBLIC METHODS
    //

    requestGadget: function (param_str) {
        var data = 'members='+escape(JSON.stringify(this.obj.conf.members));
        return postSyncUrl(this.obj.conf.gadget_url + param_str, data);
    },

    detectGadgetType: function (param_str) {
        var content = this.requestGadget(param_str);
        if (content.substring(0, 4) === 'GIF8' || ! /^[\x00-\x7F]*$/.test(content[0]))
            this.gadget_type = 'img';
        else
            this.gadget_type = 'html';
    },

    /**
     * Parses the object as gadget
     */
    renderGadget: function () {
        var sParams = 'name1=' + this.obj.conf.name;
        if (this.obj.conf.type == 'service')
            sParams += '&name2=' + escapeUrlValues(this.obj.conf.service_description);

        sParams += '&type=' + this.obj.conf.type
                 + '&object_id=' + this.obj.conf.object_id
                 + '&scale=' + escapeUrlValues(this.obj.conf.gadget_scale.toString())
                 + '&state=' + this.obj.conf.summary_state
                 + '&stateType=' + this.obj.conf.state_type
                 + '&ack=' + this.obj.conf.summary_problem_has_been_acknowledged
                 + '&downtime=' + this.obj.conf.summary_in_downtime;

        if (this.obj.conf.type == 'dyngroup')
            sParams += '&object_types=' + this.obj.conf.object_types;

        if (this.obj.conf.perfdata && this.obj.conf.perfdata != '')
            sParams += '&perfdata=' + this.obj.conf.perfdata.replace(/\&quot\;|\&\#145\;/g,'%22');

        // Process the optional gadget_opts param
        if (this.obj.conf.gadget_opts && this.obj.conf.gadget_opts != '')
            sParams += '&opts=' + escapeUrlValues(this.obj.conf.gadget_opts.toString());

        // Append with leading "?" or "&" to build a correct url
        if (this.obj.conf.gadget_url.indexOf('?') == -1)
            sParams = '?' + sParams;
        else
            sParams = '&' + sParams;

        this.detectGadgetType(sParams);
        if (this.gadget_type === 'img') {
            var oGadget = document.createElement('img');
            addZoomHandler(oGadget);
            oGadget.src = this.obj.conf.gadget_url + sParams;

            var alt = this.obj.conf.type + '-' + this.obj.conf.name;
            if (this.obj.conf.type == 'service')
                alt += '-'+this.obj.conf.service_description;
            oGadget.alt = alt;
        } else {
            var oGadget = document.createElement('div');
            oGadget.innerHTML = this.requestGadget(sParams);
        }
        oGadget.setAttribute('id', this.obj.conf.object_id + '-icon');

        var oIconDiv = document.createElement('div');
        this.dom_obj = oIconDiv;
        oIconDiv.setAttribute('id', this.obj.conf.object_id + '-icondiv');
        oIconDiv.setAttribute('class', 'icon');
        oIconDiv.setAttribute('className', 'icon');
        oIconDiv.style.position = 'absolute';
        oIconDiv.style.zIndex   = this.obj.conf.z;

        // Parse link only when set
        if(this.obj.conf.url && this.obj.conf.url !== '') {
            var oIconLink = document.createElement('a');
            oIconLink.href = this.obj.conf.url;
            oIconLink.target = this.obj.conf.url_target;
            oIconLink.appendChild(oGadget);
            oGadget = null;

            oIconDiv.appendChild(oIconLink);
            oIconLink = null;
        } else {
            oIconDiv.appendChild(oGadget);
            oGadget = null;
        }
    }
});
