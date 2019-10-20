// Copyright 2019 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

function adaptcolor({color = '#0000ff', base = '#ffffff', ratios = [3, 4.5, 7], tint = '#fefefe', shade = '#010101', colorspace = 'LCH', lib = 'd3'} = {}) {

  // Using HSLuv "v" value as a uniform domain in gradients.
  // This should be uniform regardless of library / colorspace.
  // TODO: investigate alternative luminosity/brightness calculations.
  swatches = 2000; // should be 2000 if able to render every possible decimal value of contrast.
  domain = swatches - swatches * (d3.hsluv(color).v / 100);
  tintDomain = swatches - swatches * (d3.hsluv(tint).v / 100);
  shadeDomain = swatches - swatches * (d3.hsluv(shade).v / 100);

  if(lib == 'd3') {
    if(colorspace == 'CAM02') {
      scale = d3.scaleLinear()
        .range(['#ffffff', tint, d3.jab(color), shade, '#000000'])
        .domain([0, tintDomain, domain, shadeDomain, swatches])
        .interpolate(d3.interpolateJab);
    }
    if(colorspace == 'LCH') {
      scale = d3.scaleLinear()
        .range([d3.hcl(NaN, 0, 100), tint, d3.hcl(color), shade, d3.hcl(NaN, 0, 0)])
        .domain([0, tintDomain, domain, shadeDomain, swatches])
        .interpolate(d3.interpolateHcl);
    }
    if(colorspace == 'LAB') {
      scale = d3.scaleLinear()
        .range(['#ffffff', tint, d3.lab(color), shade, '#000000'])
        .domain([0, tintDomain, domain, shadeDomain, swatches])
        .interpolate(d3.interpolateLab);
    }
    if(colorspace == 'HSL') {
      scale = d3.scaleLinear()
        .range(['#ffffff', tint, d3.hsl(color), shade, '#000000'])
        .domain([0, tintDomain, domain, shadeDomain, swatches])
        .interpolate(d3.interpolateHsl);
    }
    if(colorspace == 'HSLuv') {
      scale = d3.scaleLinear()
        .range(['#ffffff', tint, d3.hsluv(color), shade, '#000000'])
        .domain([0, tintDomain, domain, shadeDomain, swatches])
        .interpolate(d3.interpolateHsluv);
    }
    if(colorspace == 'RGB') {
      scale = d3.scaleLinear()
        .range([d3.rgb('#ffffff'), tint, d3.rgb(color), shade, d3.rgb('#000000')])
        .domain([0, tintDomain, domain, shadeDomain, swatches])
        .interpolate(d3.interpolateRgb);
    }
    if(colorspace == 'RGBgamma') {
      scale = d3.scaleLinear()
        .range([d3.rgb('#ffffff'), tint, d3.rgb(color), shade, d3.rgb('#000000')])
        .domain([0, tintDomain, domain, shadeDomain, swatches])
        .interpolate(d3.interpolateRgb.gamma(2.2));
    }
  }

  var Colors = d3.range(swatches).map(function(d) {
    return scale(d)
  });
  colors = Colors.filter(function (el) {
    return el != null;
  });

  var Contrasts = d3.range(swatches).map(function(d) {
    var ca = contrastD3(scale(d), base).toFixed(2);
    return Number(ca);
  });
  contrasts = Contrasts.filter(function (el) {
    return el != null;
  })

  var baseLum = luminance(d3.rgb(base).r, d3.rgb(base).g, d3.rgb(base).b);

  newColors = [];

  // Return color matching target ratio, or closest number
  for(i=0; i < ratios.length; i++){
    var r = binarySearch(contrasts, ratios[i], baseLum);
    newColors.push(colors[r]);
  }

  return newColors;
}

// Test script:
// adaptcolor({color: '#2451FF', base: '#f5f5f5', ratios: [3, 4.5], tint: '#C9FEFE', shade: '#012676', colorspace: 'RGB', lib: 'd3'});

function luminance(r, g, b) {
  var a = [r, g, b].map(function (v) {
      v /= 255;
      return v <= 0.03928
          ? v / 12.92
          : Math.pow( (v + 0.055) / 1.055, 2.4 );
  });
  return (a[0] * 0.2126) + (a[1] * 0.7152) + (a[2] * 0.0722);
}

// function percievedLum(r, g, b) {
//   return (0.299*r + 0.587*g + 0.114*b);
// }

function contrast(rgb1, rgb2) {
  var cr1 = (luminance(rgb1[0], rgb1[1], rgb1[2]) + 0.05) / (luminance(rgb2[0], rgb2[1], rgb2[2]) + 0.05);
  var cr2 = (luminance(rgb2[0], rgb2[1], rgb2[2]) + 0.05) / (luminance(rgb1[0], rgb1[1], rgb1[2]) + 0.05);

  if (cr1 < 1) { return cr2; }
  if (cr1 >= 1) { return cr1; }
}

function contrastD3(rgb1, rgb2) {
  var cr1 = (luminance(d3.rgb(rgb1).r, d3.rgb(rgb1).g, d3.rgb(rgb1).b) + 0.05) / (luminance(d3.rgb(rgb2).r, d3.rgb(rgb2).g, d3.rgb(rgb2).b) + 0.05);
  var cr2 = (luminance(d3.rgb(rgb2).r, d3.rgb(rgb2).g, d3.rgb(rgb2).b) + 0.05) / (luminance(d3.rgb(rgb1).r, d3.rgb(rgb1).g, d3.rgb(rgb1).b) + 0.05);

  if (cr1 < 1) { return cr2; }
  if (cr1 >= 1) { return cr1; }
}

// Binary search to find index of contrast ratio that is input
// Modified from https://medium.com/hackernoon/programming-with-js-binary-search-aaf86cef9cb3
function binarySearch (list, value, baseLum) {
  // initial values for start, middle and end
  let start = 0
  let stop = list.length - 1
  let middle = Math.floor((start + stop) / 2)

  // While the middle is not what we're looking for and the list does not have a single item
  while (list[middle] !== value && start < stop) {
    // Value greater than since array is ordered descending
    if(baseLum > 0.5) {  // if base is light, ratios ordered ascending
      if (value < list[middle]) {
        stop = middle - 1
      } else {
        start = middle + 1
      }
    } else { // order descending
      if (value > list[middle]) {
        stop = middle - 1
      } else {
        start = middle + 1
      }
    }
    // recalculate middle on every iteration
    middle = Math.floor((start + stop) / 2)
  }

  // If no match, find next closest value
  // closest = list.reduce((prev, curr) => Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev);

  // If no match, find closest item greater than value
  closest = list.reduce((prev, curr) => curr > value ? curr : prev);

  // if the current middle item is what we're looking for return it's index, else closest
  return (list[middle] == !value) ? closest : middle // how it was originally expressed
}