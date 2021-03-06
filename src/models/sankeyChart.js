nv.models.sankeyChart = function () {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var sankey = nv.models.sankey();
    var tooltip = nv.models.tooltip();

    var margin = {top: 30, right: 20, bottom: 20, left: 20}
        , width = null
        , height = null
        , color = nv.utils.defaultColor()
        , font = 'serif'
        , id = Math.round(Math.random() * 100000)
        , defaultState = null
        , noData = null
        , duration = 250
        , dispatch = d3.dispatch('stateChange', 'changeState', 'renderEnd', 'selectChange')
        , tipContent = function(){}
        ;

    tooltip.duration(0);

    //============================================================
    // Private Variables
    //------------------------------------------------------------

    var renderWatch = nv.utils.renderWatch(dispatch);
    tooltip
        .headerEnabled(true)
        .headerFormatter(function(d){
            return d.name;
        })
        .valueFormatter(function (d, i) {
            return d;
        });

    //============================================================
    // Chart function
    //------------------------------------------------------------

    function chart(selection) {
        renderWatch.reset();
        renderWatch.models(sankey);

        selection.each(function (data) {
            var container = d3.select(this);
            nv.utils.initSVG(container);

            var that = this;
            var availableWidth = nv.utils.availableWidth(width, container, margin),
                availableHeight = nv.utils.availableHeight(height, container, margin);

            chart.update = function () {
                if (duration === 0) {
                    container.call(chart);
                } else {
                    container.transition().duration(duration).call(chart);
                }
            };
            chart.container = this;

            tooltip
                .chartContainer(chart.container.parentNode);

            // Display No Data message if there's nothing to show.
            if (!data || !data.nodes || !data.nodes.length) {
                nv.utils.noData(chart, container);
                return chart;
            } else {
                container.selectAll('.nv-noData').remove();
            }

            // Setup containers and skeleton of chart
            var gChart = container.selectAll('g.nv-wrap.nv-sankeyChart').data([data]);
            var gChartEnter = gChart.enter().append('g').attr('class', 'nvd3 nv-wrap nv-sankeyChart');
            //var g = gChart.select('g');

            gChartEnter.append('g').attr('class', 'nv-sankeyWrap');

            gChart.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            // Main Chart Component(s)
            sankey.width(availableWidth).height(availableHeight);

            var wrap = gChart.select('.nv-sankeyWrap').datum(data);
            wrap.call(sankey);

        });

        renderWatch.renderEnd('sankeyChart immediate');
        return chart;
    }

    //============================================================
    // Event Handling/Dispatching (out of chart's scope)
    //------------------------------------------------------------

    sankey.dispatch.on('elementMouseover.tooltip', function (evt) {
        //console.log(evt);

        evt['series'] = [
        /*    {
                key: evt.data.name,
                value: d3.format(",.0f")(evt.data.value || 0),
                color: evt.data.color
            }
        */
        ].concat( tipContent(evt.data) || [] );

        tooltip.data(evt).hidden(false);
    });

    sankey.dispatch.on('elementMouseout.tooltip', function (evt) {
        tooltip.hidden(true);
    });

    sankey.dispatch.on('elementMousemove.tooltip', function (evt) {
        tooltip();
    });

    sankey.dispatch.on('nodeClick.node', function (evt) {

        var d = evt.data;

        d.selected = !d.selected;

        d3.select(sankey.container).selectAll('.node').each(function(d,i){
            d3.select(this).classed('selected', d.selected );
        });

        d3.select(sankey.container).selectAll('.link').each(function(l){
            l.selected = l.sourceNode.selected && l.targetNode.selected;
            d3.select(this).classed('selected', l.selected );
        });

        dispatch.selectChange([d]);
    });

    function hasSelected( links ){
        return links && links.filter( function(l){ return l.selected; }).length > 0;
    }


    sankey.dispatch.on('linkClick.link', function (evt) {

        var link = evt.data;

        if (link.hasOwnProperty('source') && link.hasOwnProperty('target')) {

            link.selected = !link.selected;

            if ( link.selected ) {

                var idxS = link.sourceNode.selected;
                var idxT = link.targetNode.selected;

                if (!idxS || !idxT) {
                    if (!idxS) {
                        link.sourceNode.selected = true;
                    }
                    if (!idxT) {
                        link.targetNode.selected = true;
                    }
                }
            }
            else {
                delete link.selected;
                link.sourceNode.selected = hasSelected(link.sourceNode.targetLinks) || hasSelected(link.sourceNode.sourceLinks);
                link.targetNode.selected = hasSelected(link.targetNode.targetLinks) || hasSelected(link.targetNode.sourceLinks);
            }

            d3.select(sankey.container).selectAll('.link').each(function(d,i){
                d3.select(this).classed('selected', d.selected );
            });

            d3.select(sankey.container).selectAll('.node').each(function(d,i){
                d3.select(this).classed('selected', d.selected );
            });

        }

        dispatch.selectChange([link.sourceNode, link.targetNode]);
    });

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    // expose chart's sub-components
    chart.dispatch = dispatch;
    chart.sankey = sankey;
    chart.tooltip = tooltip;
    chart.options = nv.utils.optionsFunc.bind(chart);

    // use Object get/set functionality to map between vars and chart functions
    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        noData: {
            get: function () {
                return noData;
            }, set: function (_) {
                noData = _;
            }
        },
        defaultState: {
            get: function () {
                return defaultState;
            }, set: function (_) {
                defaultState = _;
            }
        },

        // options that require extra logic in the setter
        color: {
            get: function () {
                return color;
            }, set: function (_) {
                color = _;
                sankey.color(color);
            }
        },
        font: {
            get: function () {
                return font;
            }, set: function (_) {
                font = _;
                sankey.font(font);
            }
        },
        tipContent: {
            get: function () {
                return tipContent;
            }, set: function (_) {
                tipContent = d3.functor(_);
            }
        },
        duration: {
            get: function () {
                return duration;
            }, set: function (_) {
                duration = _;
                renderWatch.reset(duration);
                sankey.duration(duration);
            }
        },
        margin: {
            get: function () {
                return margin;
            }, set: function (_) {
                margin.top = _.top !== undefined ? _.top : margin.top;
                margin.right = _.right !== undefined ? _.right : margin.right;
                margin.bottom = _.bottom !== undefined ? _.bottom : margin.bottom;
                margin.left = _.left !== undefined ? _.left : margin.left;
            }
        }
    });
    nv.utils.inheritOptions(chart, sankey);
    nv.utils.initOptions(chart);
    return chart;
};
