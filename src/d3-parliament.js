/* eslint-disable no-param-reassign */
import * as d3Dispatch from 'd3-dispatch';
import * as d3Select from 'd3-selection';
import * as d3Shape from 'd3-shape';
import * as d3Transition from 'd3-transition';
import series from './util/series';

const d3 = {
  ...d3Dispatch,
  ...d3Select,
  ...d3Shape,
  ...d3Transition,
};

function parliament() {
  /* params */
  let width;
  let height;
  let innerRadiusCoef = 0.4;

  /* animations */
  const enter = {
    // smallToBig: true,
    // fromCenter: true,
  };
  const update = {
    animate: true,
  };
  const exit = {
    bigToSmall: true,
    toCenter: true,
  };

  /* events */
  const parliamentDispatch = d3.dispatch('click', 'dblclick', 'mousedown', 'mouseenter',
    'mouseleave', 'mousemove', 'mouseout', 'mouseover', 'mouseup', 'touchcancel', 'touchend',
    'touchmove', 'touchstart');

  function innerParliament(data) {
    data.each(function createViz(d) {
      // if user did not provide, fill the svg:
      width = width || this.getBoundingClientRect().width;
      height = width ? width / 2 : this.getBoundingClientRect().width / 2;

      const outerParliamentRadius = Math.min(width / 2, height);
      const innerParliamentRadius = outerParliamentRadius * innerRadiusCoef;

      /* init the svg */
      const svg = d3.select(this);

      /** *
       * compute number of seats and rows of the parliament */
      let nSeats = 0;
      d.forEach((p) => {
        nSeats += (typeof p.seats === 'number') ? Math.floor(p.seats) : p.seats.length;
      });

      let nRows = 0;
      let maxSeatNumber = 0;
      let b = 1;
      ((() => {
        let loopCounter = 0;
        const a = innerRadiusCoef / (1 - innerRadiusCoef);
        while (maxSeatNumber < nSeats) {
          nRows += 1;
          b += a;
          /* NOTE: the number of seats available in each row depends on the total number
          of rows and floor() is needed because a row can only contain entire seats. So,
          it is not possible to increment the total number of seats adding a row. */
          // eslint-disable-next-line no-loop-func
          maxSeatNumber = series((i) => Math.floor(Math.PI * (b + i)), nRows - 1);
          loopCounter += 1;
          if (loopCounter > 1000) {
            break;
          }
        }
      })());

      /** *
       * create the seats list */
      /* compute the cartesian and polar coordinates for each seat */
      const rowWidth = (outerParliamentRadius - innerParliamentRadius) / nRows;
      const seats = [];
      ((() => {
        const seatsToRemove = maxSeatNumber - nSeats;
        for (let i = 0; i < nRows; i += 1) {
          const rowRadius = innerParliamentRadius + rowWidth * (i + 0.5);
          const rowSeats = Math.floor(Math.PI * (b + i))
            - Math.floor(seatsToRemove / nRows) - (seatsToRemove % nRows > i ? 1 : 0);
          const anglePerSeat = Math.PI / rowSeats;
          for (let j = 0; j < rowSeats; j += 1) {
            const s = {};
            s.polar = {
              r: rowRadius,
              teta: -Math.PI + anglePerSeat * (j + 0.5),
            };
            s.cartesian = {
              x: s.polar.r * Math.cos(s.polar.teta),
              y: s.polar.r * Math.sin(s.polar.teta),
            };
            seats.push(s);
          }
        }
      })());

      /* sort the seats by angle */
      seats.sort(
        (seatA, seatB) => seatA.polar.teta - seatB.polar.teta || seatB.polar.r - seatA.polar.r,
      );

      /* fill the seat objects with data of its party and of itself if existing */
      ((() => {
        let partyIndex = 0;
        let seatIndex = 0;
        seats.forEach((s) => {
          /* get current party and go to the next one if it has all its seats filled */
          let party = d[partyIndex];
          const nSeatsInParty = typeof party.seats === 'number' ? party.seats : party.seats.length;
          if (seatIndex >= nSeatsInParty) {
            partyIndex += 1;
            seatIndex = 0;
            party = d[partyIndex];
          }

          /* set party data */
          s.party = party;
          s.data = typeof party.seats === 'number' ? null : party.seats[seatIndex];

          seatIndex += 1;
        });
      })());

      /** *
       * helpers to get value from seat data */
      const seatClasses = (dataPoint) => {
        let c = 'seat ';
        c += (dataPoint.party && dataPoint.party.id) || '';
        return c.trim();
      };
      const seatFill = (dataPoint) => dataPoint.party.fill;
      const seatX = (dataPoint) => dataPoint.cartesian.x;
      const seatY = (dataPoint) => dataPoint.cartesian.y;
      const seatRadius = (dataPoint) => {
        let r = 0.4 * rowWidth;
        if (dataPoint.data && typeof dataPoint.data.size === 'number') {
          r *= dataPoint.data.size;
        }
        return r;
      };

      /** *
       * fill svg with seats as circles */
      /* container of the parliament */
      let container = svg.select('.parliament');
      if (container.empty()) {
        container = svg.append('g');
        container.classed('parliament', true);
      }
      container.attr('transform', `translate(${width / 2},${outerParliamentRadius})`);

      /* all the seats as circles */
      const circles = container.selectAll('.seat').data(seats);
      circles.attr('class', seatClasses);

      /* animation adding seats to the parliament */
      const circlesEnter = circles.enter().append('circle');
      circlesEnter.attr('class', seatClasses);
      circlesEnter.attr('fill', seatFill);
      circlesEnter.attr('cx', enter.fromCenter ? 0 : seatX);
      circlesEnter.attr('cy', enter.fromCenter ? 0 : seatY);
      circlesEnter.attr('r', enter.smallToBig ? 0 : seatRadius);
      if (enter.fromCenter || enter.smallToBig) {
        const t = circlesEnter.transition().duration(() => 1000 + Math.random() * 800);
        if (enter.fromCenter) {
          t.attr('cx', seatX);
          t.attr('cy', seatY);
        }
        if (enter.smallToBig) {
          t.attr('r', seatRadius);
        }
      }

      /* circles catch mouse and touch events */
      // eslint-disable-next-line guard-for-in,no-restricted-syntax
      for (const evt in parliamentDispatch._) {
        (((dispatchedEvent) => {
          function callEvent(e) {
            parliamentDispatch.call(dispatchedEvent, this, e);
          }

          circlesEnter.on(dispatchedEvent, callEvent);
        })(evt));
      }

      let circlesUpdate;
      /* animation updating seats in the parliament */
      if (update.animate) {
        circlesUpdate = circles.transition().duration(() => 1000 + Math.random() * 800);
      } else {
        circlesUpdate = circles;
      }
      circlesUpdate.attr('cx', seatX)
        .attr('cy', seatY)
        .attr('r', seatRadius);

      /* animation removing seats from the parliament */
      if (exit.toCenter || exit.bigToSmall) {
        const t = circles.exit().transition().duration(() => 1000 + Math.random() * 800);
        if (exit.toCenter) {
          t.attr('cx', 0).attr('cy', 0);
        }
        if (exit.bigToSmall) {
          t.attr('r', 0);
        }
        t.remove();
      } else {
        circles.exit().remove();
      }
    });
  }

  innerParliament.width = function setWidth(newWidth) {
    if (!arguments.length) return width;
    width = newWidth;
    return innerParliament;
  };

  /**
   * @deprecated
   * @returns {innerParliament|number}
   */
  innerParliament.height = function setHeight() {
    if (!arguments.length) return height;
    return innerParliament;
  };

  innerParliament.innerRadiusCoef = function setInnerRadiusCoef(value) {
    if (!arguments.length) return innerRadiusCoef;
    innerRadiusCoef = value;
    return innerParliament;
  };

  innerParliament.enter = {
    smallToBig(value) {
      if (!arguments.length) return enter.smallToBig;
      enter.smallToBig = value;
      return innerParliament.enter;
    },
    fromCenter(value) {
      if (!arguments.length) return enter.fromCenter;
      enter.fromCenter = value;
      return innerParliament.enter;
    },
  };

  innerParliament.update = {
    animate(value) {
      if (!arguments.length) return update.animate;
      update.animate = value;
      return innerParliament.update;
    },
  };

  innerParliament.exit = {
    bigToSmall(value) {
      if (!arguments.length) return exit.bigToSmall;
      exit.bigToSmall = value;
      return innerParliament.exit;
    },
    toCenter(value) {
      if (!arguments.length) return exit.toCenter;
      exit.toCenter = value;
      return innerParliament.exit;
    },
  };

  innerParliament.on = function handleEvent(type, callback) {
    parliamentDispatch.on(type, callback);
  };

  return innerParliament;
}

export default parliament;
