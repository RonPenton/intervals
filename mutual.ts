import Decimal from "decimal.js";

const bondRatio = 10;
const internationalRatio = 40;

const addToIra = new Decimal(0);                            // F2
const addToBrokerage = new Decimal(0);                      // F3

const initialIraUs = new Decimal(4000);                     // F4
const initialIraInternational = new Decimal(2000);          // F5
const initialIraBonds = new Decimal(1000);                  // F6
const initialBrokerageUs = new Decimal(10000);              // F7
const initialBrokerageInternational = new Decimal(5000);    // F8

const addToIraUs = new Decimal(0);                          // F9
const addToIraInternational = new Decimal(0);               // F10
const addToIraBonds = new Decimal(0);                       // F11
const addToBrokerageUs = new Decimal(0);                    // F12
const addToBrokerageInternational = new Decimal(0);         // F13


const checkIra = addToIraUs.plus(addToIraInternational).plus(addToIraBonds).equals(addToIra) ? 'OK' : 'CHECK';      // F14
const checkBrokerage = addToBrokerageUs.plus(addToBrokerageInternational).equals(addToBrokerage) ? 'OK' : 'CHECK';  // F15

const usRatio = 100 - internationalRatio;
const bondPercent = new Decimal(bondRatio).div(100);
const stocksPercent = new Decimal(1).minus(bondPercent);
const usPercent = stocksPercent.times(new Decimal(usRatio).div(100));
const internationalPercent = stocksPercent.times(new Decimal(internationalRatio).div(100));

const initialTotalUs = initialIraUs.plus(initialBrokerageUs);                                   // F16
const initialTotalInternational = initialIraInternational.plus(initialBrokerageInternational);  // F17
const initialTotalBonds = initialIraBonds;                                                      // F18   

const initialTotalIra = initialIraUs.plus(initialIraInternational).plus(initialIraBonds);       // F19
const initialTotalBrokerage = initialBrokerageUs.plus(initialBrokerageInternational);           // F20

const initialTotal = initialTotalIra.plus(initialTotalBrokerage);                               // F21

const newTotalIra = initialTotalIra.plus(addToIra);                                             // F22
const newTotalBrokerage = initialTotalBrokerage.plus(addToBrokerage);                           // F23
const newTotal = initialTotal.plus(addToIra).plus(addToBrokerage);                              // F24

const idealUs = newTotal.times(usPercent);                                                      // F25
const idealInternational = newTotal.times(internationalPercent);                                // F26
const idealBonds = newTotal.times(bondPercent);                                                 // F27


const perfectRebalanceTotal = Decimal.max(
    initialTotalUs.div(usPercent),
    initialTotalInternational.div(internationalPercent),
    initialTotalBonds.div(bondPercent)
);                                                                                              // F28

// const perfectUs = perfectRebalanceTotal.times(usPercent);
// const perfectInternational = perfectRebalanceTotal.times(internationalPercent);
// const perfectBonds = perfectRebalanceTotal.times(bondPercent);

// const perfectUsDeficit = perfectUs.minus(initialTotalUs);                                       // F29
// const perfectInternationalDeficit = perfectInternational.minus(initialTotalInternational);      // F30
// const perfectBondsDeficit = perfectBonds.minus(initialTotalBonds);                              // F31 
// const perfectDeposit = sumP(perfectUsDeficit, perfectInternationalDeficit, perfectBondsDeficit); // F32



console.log({ usPercent, internationalPercent, bondPercent });
console.log({ checkIra, checkBrokerage });
console.log({ idealUs, idealInternational, idealBonds });
// console.log({ perfectUs, perfectInternational, perfectBonds, perfectDeposit });




function sumP(...decimals: Decimal[]) {
    return decimals.filter(x => x.greaterThan(0)).reduce((a, b) => a.plus(b), new Decimal(0));
}


// vtotal -> newTotal
// qstar -> idealus
// rstar -> idealinternational
// sstar -> idealbonds
// ytotal -> newTotalIra
// xbase -> initialTotalBrokerage

const bondNew = Decimal.min(idealBonds, newTotalIra);                       // e_new
const remainingIraCapacity = Decimal.max(0, newTotalIra.minus(bondNew));    // yqrcap
const brokerageStockTarget = Decimal.max(0, idealUs.plus(idealInternational).minus(remainingIraCapacity));  // xqrtarget

const brokerageStockMin = initialTotalBrokerage;    // xqrmin
const brokerageStockMax = initialTotalBrokerage.plus(addToBrokerage); // xqrmax
const brokerageStockNew = Decimal.clamp(brokerageStockTarget, brokerageStockMin, brokerageStockMax); // xqrnew

console.log({ bondNew, remainingIraCapacity, brokerageStockTarget, brokerageStockNew });


const brokerageUsTry = Decimal.clamp(idealUs, initialBrokerageUs, initialBrokerageUs.plus(addToBrokerage)); // atry
const brokerageUsLow = Decimal.max(initialBrokerageUs, brokerageStockNew.minus(initialBrokerageInternational.add(addToBrokerage))); // alow
const brokerageUsHigh = Decimal.min(initialBrokerageUs.plus(addToBrokerage), brokerageStockNew.minus(initialBrokerageInternational)); // ahigh
const brokerageUsNew = Decimal.clamp(brokerageUsTry, brokerageUsLow, brokerageUsHigh); // anew

const brokerageInternationalNew = brokerageStockNew.minus(brokerageUsNew); // bnew

const iraUsTarget = Decimal.max(0, idealUs.minus(brokerageUsNew)); // ctarget
const iraInternationalTarget = Decimal.max(0, idealInternational.minus(brokerageInternationalNew)); // dtarget
const needIra = iraUsTarget.plus(iraInternationalTarget).plus(bondNew); // needira

console.log({})