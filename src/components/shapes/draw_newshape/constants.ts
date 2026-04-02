const CIRCLE_SIDES = 32;  // should be divisible by 4

export default {
    CIRCLE_SIDES: CIRCLE_SIDES,
    i000: 0,
    i090: CIRCLE_SIDES / 4,
    i180: CIRCLE_SIDES / 2,
    i270: CIRCLE_SIDES / 4 * 3,
    cos45: Math.cos(Math.PI / 4),
    sin45: Math.sin(Math.PI / 4),
    SQRT2: Math.sqrt(2)
};
