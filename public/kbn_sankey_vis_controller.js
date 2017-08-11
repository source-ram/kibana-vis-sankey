var observeResize = require('./lib/observe_resize');
require('./lib/observe_resize');

define(function (require) {
  import { uiModules } from 'ui/modules';
  var module = uiModules.get('kibana/kbn_sankey_vis', []);
  var d3 = require('d3');
  var _ = require('lodash');
  var $ = require('jquery');
  var S = require('d3-plugins-sankey');
  var formatNumber = d3.format(',.0f');
  var format = function (d) { return formatNumber(d) + ' TWh';  };

  module.controller('KbnSankeyVisController', function ($scope, $element, $rootScope, Private) {
    var sankeyAggResponse = Private(require('./lib/agg_response'));
    const queryFilter = = Private(FilterBarQueryFilterProvider);

    var svgRoot = $element[0];
    var color = d3.scale.category10();
    var margin = 20;
    var width;
    var height;
    var div;
    var svg;

    var _updateDimensions = function () {
      var delta = 18;
      var w = $element.parent().width();
      var h = $element.parent().height();
      if (w) {
        if (w > delta) {
          w -= delta;
        }
        width = w;
      }
      if (h) {
        if (h > delta) {
          h -= delta;
        }
        height = h;
      }
    };


    var _buildVis = function (data) {
      var energy = data.slices;
      div = d3.select(svgRoot);

      if (!energy.nodes.length) return;

      svg = div.append('svg')
        .attr('width', width)
        .attr('height', height + margin)
        .append('g')
        .attr('transform', 'translate(0, 0)');

      var sankey = d3.sankey()
        .nodeWidth(15)
        .nodePadding(10)
        .size([width, height]);
      var path = sankey.link();
      sankey
        .nodes(energy.nodes)
        .links(energy.links)
        .layout(32);

      var link = svg.append('g').selectAll('.link')
        .data(energy.links)
        .enter().append('path')
        .attr('class', 'link')
        .attr('d', path)
        .style('stroke-width', function (d) { return Math.max(1, d.dy);  })
        .sort(function (a, b) { return b.dy - a.dy;  });

      link.append('title')
        .text(function (d) { return d.source.name + ' → ' + d.target.name + '\n' + format(d.value);  });

      var node = svg.append('g').selectAll('.node')
        .data(energy.nodes)
        .enter().append('g')
        .attr('class', 'node')
        .attr('transform', function (d) { return 'translate(' + d.x + ',' + d.y + ')';  })
        .on('click', function(node){
          console.log('click',node);
          console.log('fields', energy.fields);

          let searchField = energy.fields[node.name].field;
          const q2 = {
            query: {
              match: {}
            },
            meta: {
              index: energy.fields[node.name].index
            }
          };
          q2.query.match[searchField] = {
            query: node.name,
            type: 'phrase'
          };
          queryFilter.addFilters([q2]);
        })
        //.call(d3.behavior.drag()
        //.origin(function (d) { return d;  })
        //.on('dragstart', function () { this.parentNode.appendChild(this);  })
        //.on('drag', dragmove));

      node.append('rect')
        .attr('height', function (d) { return d.dy;  })
        .attr('width', sankey.nodeWidth())
        .style('fill', function (d) { return d.color = color(d.name);  })
        .style('stroke', function (d) { return d3.rgb(d.color).darker(2);  })
        .append('title')
        .text(function (d) { return d.name + '\n' + format(d.value);  });

      node.append('text')
        .attr('x', -6)
        .attr('y', function (d) { return d.dy / 2;  })
        .attr('dy', '.35em')
        .attr('text-anchor', 'end')
        .attr('transform', null)
        .text(function (d) { return d.name;  })
        .filter(function (d) { return d.x < width / 2;  })
        .attr('x', 6 + sankey.nodeWidth())
        .attr('text-anchor', 'start');

      function dragmove(d) {
        d3.select(svgRoot).attr('transform', 'translate(' + d.x + ',' + (d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))) + ')');
        sankey.relayout();
        link.attr('d', path);
      }
    };


    var _render = window.render = function (data) {
      d3.select(svgRoot).selectAll('svg').remove();
      _buildVis(data);
    };

    var chartData;
    $scope.$watch('esResponse', function (resp) {
      if (resp) {
        chartData = sankeyAggResponse($scope.vis, resp);
        _updateDimensions();
        _render(chartData);
      }
    });

    observeResize($element, function () {
      if (chartData) {
        _updateDimensions();
        _render(chartData);
      }
    });
  });
});
