// based on http://bl.ocks.org/kerryrodden/477c1bfb081b783f80ad
nv.models.sankey = function () {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var margin = {top: 0, right: 0, bottom: 0, left: 0}
        , width = null
        , height = null
        , id = Math.floor(Math.random() * 10000) //Create semi-unique ID in case user doesn't select one
        , container = null
        , color = nv.utils.defaultColor()
        , font = 'serif'
    //, groupColorByParent = true
        , duration = 500
        , meterWidth = 7
        , x = d3.scale.linear()
        , y = d3.scale.linear()
        , dispatch = d3.dispatch('chartClick', 'elementClick', 'nodeClick', 'linkClick', 'nodeDblClick', 'elementMousemove', 'elementMouseover', 'elementMouseout', 'renderEnd')
        , formatName = function (d) {
            return d.name;
        }
        , format = function (d) {
            return d3.format(",.1f")(d);
        }
        , labels = false
        , meters = false
        ;

    var sankey = d3.sankey()
        .nodeWidth(30)
        .nodePadding(10);


    var path = sankey.link();

    //============================================================
    // chart function
    //------------------------------------------------------------

    var renderWatch = nv.utils.renderWatch(dispatch);

    function chart(selection) {
        renderWatch.reset();

        selection.each(function (data) {
            container = d3.select(this);
            var availableWidth = nv.utils.availableWidth(width, container, margin);
            var availableHeight = nv.utils.availableHeight(height, container, margin);

            x.range([0, availableWidth - sankey.nodeWidth()]);

            y.range([0, availableHeight]);

            x.domain([0, availableWidth]);
            y.domain([0, availableHeight]);

/*
            var zoom = d3.behavior.zoom()
                .scaleExtent([1, 4])
                .on("zoom", function () {
                    container.selectAll('.node')
                        .attr("transform", function (d) {
                            return "translate(" + x(d.x) + "," + d.y + ")";
                        });

                    container.selectAll('.link')
                        .attr("d", linkPath);
                }).x(x);
*/

            var linkPath = (function () {
                var curvature = .5;

                function link(d) {
                    var x0 = x(d.sourceNode.x) + d.sourceNode.dx,
                        x1 = x(d.targetNode.x) ,
                        xi = d3.interpolateNumber(x0, x1),
                        x2 = xi(curvature),
                        x3 = xi(1 - curvature),
                        y0 = (d.sourceNode.y) + d.sy + d.dy / 2,
                        y1 = (d.targetNode.y) + d.ty + d.dy / 2;
                    return "M" + x0 + "," + y0
                        + "C" + x2 + "," + y0
                        + " " + x3 + "," + y1
                        + " " + x1 + "," + y1;
                }

                link.curvature = function (_) {
                    if (!arguments.length) return curvature;
                    curvature = +_;
                    return link;
                };
                return link;
            })();

            nv.utils.initSVG(container);

            // Setup containers and skeleton of chart
            var wrap = container.selectAll('.nv-wrap.nv-sankey').data([data], function () {
                return data;
            });
            var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-sankey nv-chart-' + id);

            wrapEnter
                .append("clipPath")
                .attr("id", "clip-" + id)
                .append("rect")
                .attr("x", 0)
                .attr("y", 0);

            wrap
                .select("clipPath#clip-" + id)
                .select("rect")
                .attr("width", availableWidth)
                .attr("height", availableHeight);

/*
            wrapEnter.append("rect")
                .attr("class", "pane")
                .attr("x", 0)
                .attr("y", 0);
*/

            var g = container.select('.nv-wrap.nv-sankey');

/*
            g.select("rect.pane")
                .attr("width", availableWidth)
                .attr("height", availableHeight)
                .call(zoom);
*/

            if (data.nodes && data.nodes.length) {
                sankey
                    .size([availableWidth, availableHeight])
                    .nodes(data.nodes)
                    .links(data.links.filter(function (l) {
                        return l.disabled !== true;
                    }))
                    .layout(32);

                var linkWrap = g.selectAll('g.linkWrap')
                    .data([data.links])
                    .enter()
                    .append('g')
                    .attr('class', 'linkWrap')
                    .attr("clip-path", "url(#clip-" + id + ")");

                linkWrap = g.selectAll('g.linkWrap');

                var link = linkWrap.selectAll(".link")
                    .data(data.links.filter(function (l) {
                        return l.disabled !== true;
                    }), function (d) {
                        return d.source + "::" + d.target;
                    });

                var linkEnter = link.enter().append("path")
                    .attr("class", "link")
                    .on('click', function (d, i) {
                        dispatch.linkClick({
                            data: d,
                            i: i
                        });
                    });

                linkEnter.append("title")
                    .text(function (d) {
                        return formatName(d.sourceNode) + "=" + formatName(d.targetNode) + ":" + format(d.value);
                    });

                link
                    .style('opacity', 0.1)
                    .attr("d", linkPath)
                    .sort(function (a, b) {
                        return b.dy - a.dy; // so that the lighter link will be hover-able
                    });

                var nodeWrap = g.selectAll('g.nodeWrap')
                    .data([data.nodes])
                    .enter()
                    .append('g')
                    .attr('class', 'nodeWrap')
                    .attr("clip-path", "url(#clip-" + id + ")");

                nodeWrap = g.selectAll('g.nodeWrap');

                var dataNodes = data.nodes.filter(function (n) {
                    return n.value > 0;
                });

                var node = nodeWrap.selectAll(".node")
                    .data(dataNodes, function (d) {
                        return d.name;
                    });

                var nodeEnter = node
                    .enter().append("g")
                    .attr("class", "node")
                    /*
                     .call(d3.behavior.drag()
                        .origin(function (d) {
                            return d;
                        })
                        .on("dragstart", function () {
                            this.parentNode.appendChild(this);
                        })
                     .on("drag", dragmove))
                     */
                    .on('mouseover', function (d, i) {
                        d3.select(this)
                            .classed('hover', true)
                            .style('opacity', 0.8);

                        dispatch.elementMouseover({
                            data: d,
                            i: i
                        });

                    })
                    .on('mouseout', function (d, i) {
                        d3.select(this).classed('hover', false).style('opacity', 1);

                        dispatch.elementMouseout({
                            data: d,
                            i: i
                        });

                    })
                    /*.on('click', function (d, i) {
                        d.selected = !d.selected;
                        d3.select(this).classed('selected', d.selected);
                        dispatch.nodeClick({
                            data: d,
                            i: i
                        });
                    })*/;
                    /*
                     .on('dblclick', function (d, i) {
                     //d3.select(this).classed('hover', false).style('opacity', 1);
                     dispatch.nodeDblClick({
                     data: d,
                     i: i
                     });
                     })
                     */


                nodeEnter.append("rect")
                    .attr("width", sankey.nodeWidth())
                    .on('click', function (d, i) {
                        dispatch.nodeClick({
                            data: d,
                            i: i
                        });
                    });

                if ( meters ) {
                    nodeEnter.append('line')
                        .attr('class', 'meter')
                        .attr('x1', sankey.nodeWidth() - meterWidth/2)
                        .attr('x2', sankey.nodeWidth() - meterWidth/2)
                        .attr('y1', 0)
                        .attr('y2', 0)
/*                        .append("title")
                        .text(function (d) {
                            return "leak ratio " + format(100 - d.ratio) + "%";
                        })*/;
                }

                nodeEnter.append('path')
                    .attr('class', 'check')
                    .attr('d', 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z')
                    .attr('transform', function(d){ return "translate(" + (sankey.nodeWidth()/2-12) + ",3)" })
/*                    .on('click', function (d, i) {
                        //d3.select(this).classed('hover', false).style('opacity', 1);
                        dispatch.nodeClick({
                            data: d,
                            i: i,
                            action: 'check'
                        });
                    })
                    .append("title")
                    .text(function (d) {
                        return "mark flow-through";
                    })*/;

/*
                nodeEnter.append('path')
                    .attr('class', 'flow-down')
                    .attr('d', 'M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z')
                    .attr('transform', function(d){ return "translate(" + (sankey.nodeWidth()/2) + "," + (d.dy/2 + 8) + ")" })
                    .on('click', function (d, i) {
                        //d3.select(this).classed('hover', false).style('opacity', 1);
                        dispatch.nodeClick({
                            data: d,
                            i: i,
                            action: 'down'
                        });
                    })
                    .append("title")
                    .text(function (d) {
                        return "mark downstream flows";
                    });
*/

/*
                nodeEnter.append('path')
                    .attr('class', 'flow-up')
                    .attr('d', 'M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z')
                    .attr('transform', function(d){ return "translate(" + (sankey.nodeWidth()/2) + "," + (d.dy /2 - 8) + ")" })
                    .on('click', function (d, i) {
                        //d3.select(this).classed('hover', false).style('opacity', 1);
                        dispatch.nodeClick({
                            data: d,
                            i: i,
                            action: 'up'
                        });
                    })
                    .append("title")
                    .text(function (d) {
                        return "mark upstream flows";
                    });
*/

                if (labels) {
                    nodeEnter.append("text")
                        .attr("x", -6 + sankey.nodeWidth())
                        .attr("y", function (d) {
                            return d.dy / 2;
                        })
                        .attr("dy", ".35em")
                        .attr("text-anchor", "end")
                        .attr("transform", null)
                        .text(function (d) {
                            return formatName(d);
                        })
                        .filter(function (d) {
                            return d.x < width / 2;
                        })
                        .attr("x", 6 )
                        .attr("text-anchor", "start");
                }

                node
                    .transition().duration(duration)
                    .attr("transform", function (d) {
                        return "translate(" + x(d.x) + "," + d.y + ")";
                    })
                    .each('end', function () {

                        d3.select(this)
                            .select('line.meter')
                            .style("stroke", function (d) {
                                return color(d.ratio);
                            })
                            .style("stroke-width", meterWidth)
                            .attr("y1", function (d) {
                                return d.dy;
                            })
                            .attr("y2", function (d) {
                                return d.dy;
                            })
                            .transition()
                            .attr("y2", function (d) {
                                return Math.round(d.ratio * d.dy / 100);
                            });

/*
                        d3.select(this)
                            .select('title')
                            .text(function (d) {
                                return d.name + "\n" + format(d.value) + "\n" + format(d.ratio) + "%";
                            })
*/

                    })
                    .selectAll('rect')
                    .attr('height', function (d) {
                        return d.dy;
                    })
                    /*                    .style("fill", function (d) {
                     return d.color = color(d.ratio); /!*color(d.name.replace(/ .*!/, ""));*!/
                     })*/;

                /*
                 node
                 .selectAll('line')
                 .attr("stroke", function( d){ return color(d.ratio); } )
                 .attr("stroke-width", 2 )
                 .attr("x1", function( d){ return d.dx - 2; } )
                 .attr("x2", function( d){ return d.dx - 2; } )
                 .attr("y2", function( d){ return Math.round(d.ratio * d.dy / 100); } )
                 .attr("y1", function( d){ return d.dy; } );
                 */

                link.transition().duration(duration).delay(duration)
                    .style('opacity', 1)
                    .style("stroke-width", function (d) {
                        return Math.max(1, d.dy);
                    });

                node.each(function (d) {
                    d3.select(this).classed('selected', d.selected);
                });

                link.each(function (d) {
                    d3.select(this).classed('selected', d.selected);
                });

                node.exit().remove();
                link.exit().remove();
            }

            function dragmove(d) {


                var delta = d3.event.y - d.y;

                d.y = Math.max(0, Math.min(height - d.dy, d3.event.y));
                console.log(delta < 0 ? 'UP' : 'DOWN', d.y);


                d3.select(this).attr("transform", "translate(" + d.x + "," + d.y + ")");

                // this logic should be contained within d3.sankey
                /*
                 function _symetric(d){ return d.y + d.dy/2; }
                 g.selectAll('.node').filter(function(n){ return n.x === d.x; }).sort( function( a, b){ return _symetric(a) - _symetric(b)});
                 */

                sankey.relayout();
                g.selectAll('.link').attr("d", path);

                g.selectAll(".node")
                    .attr("transform", function (d) {
                        return "translate(" + d.x + "," + d.y + ")";
                    })

            }

            chart.update = function () {

                if (duration === 0) {
                    container.call(chart);
                } else {
                    container.transition().duration(duration).call(chart);
                }
            };

            chart.container = this;

            container.on('click', function (d, i) {
                dispatch.chartClick({
                    data: d,
                    index: i,
                    pos: d3.event,
                    id: id
                });
            });

        });

        renderWatch.renderEnd('sankey immediate');
        return chart;
    }

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    chart.dispatch = dispatch;
    chart.options = nv.utils.optionsFunc.bind(chart);

    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        width: {
            get: function () {
                return width;
            }, set: function (_) {
                width = _;
            }
        },
        height: {
            get: function () {
                return height;
            }, set: function (_) {
                height = _;
            }
        },
        font: {
            get: function () {
                return font;
            }, set: function (_) {
                font = _;
            }
        },
        id: {
            get: function () {
                return id;
            }, set: function (_) {
                id = _;
            }
        },
        duration: {
            get: function () {
                return duration;
            }, set: function (_) {
                duration = _;
            }
        },
        groupColorByParent: {
            get: function () {
                return groupColorByParent;
            }, set: function (_) {
                groupColorByParent = !!_;
            }
        },

        // options that require extra logic in the setter
        margin: {
            get: function () {
                return margin;
            }, set: function (_) {
                margin.top = _.top != undefined ? _.top : margin.top;
                margin.right = _.right != undefined ? _.right : margin.right;
                margin.bottom = _.bottom != undefined ? _.bottom : margin.bottom;
                margin.left = _.left != undefined ? _.left : margin.left;
            }
        },
        color: {
            get: function () {
                return color;
            }, set: function (_) {
                color = nv.utils.getColor(_);
            }
        },
        format: {
            get: function () {
                return format;
            }, set: function (_) {
                format = d3.functor(_);
            }
        },
        formatName: {
            get: function () {
                return formatName;
            }, set: function (_) {
                formatName = d3.functor(_);
            }
        },
        labels: {
            get: function () {
                return labels;
            }, set: function (_) {
                labels = _;
            }
        },
        meters: {
            get: function () {
                return meters;
            }, set: function (_) {
                meters = _;
            }
        }
    });

    nv.utils.initOptions(chart);

    return chart;
};
