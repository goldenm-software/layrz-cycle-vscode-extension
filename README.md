# Layrz Cycle Scripting Language
## Introduction
Layrz has simulators to, well, simulate things. Uses the cycle scripting language (lc for short) to generate or do something. It's very simple to use, look at this example:
```lc
MOVETO(0, 0) ATSPEED(0) ATDIRECTION(0)
WAIT(1)
MOVETO(0, 1) ATSPEED(10) ATDIRECTION(0)
```
This script will move the device to the point (0, 0) with a speed of 0 km/h and a direction of 0 degrees, then it will wait for 1 minute and then it will move the device to the point (0, 1) with a speed of 10 km/h and a direction of 0 degrees.

## Important notes
- The script is:
  * Case insensitive.
  * Whitespace insensitive.
  * Line insensitive.
- The highlight of `MOVETO` and `WAIT` are the same, so you can't use them in the same line.

## Available functionality
We provide code snippets and linting procedures, both of then fully tested and working perfectly (Almost everyting, see `Known issues` for more information).

## Available commands
### MOVETO
Moves the device to the specified coordinates. Their arguments are:
- Latitude (double) : The latitude of the point to move to.
- Longitude (double) : The longitude of the point to move to.
Note: The latitude should be between -90 and 90 and the longitude should be between -180 and 180.

### ATSPEED
Sets the speed of the device. Its argument is:
- Speed (double) : The speed to set in km/h.
Note: You can set it as AUTO to calculate the speed using `p1` and `p2` where `p1` is the previous position and `p2` is the current position.
Note 2: The argument should be greater than 0.

### WITHHDOP
Sets the HDOP of the device. Its argument is:
- HDOP (double) : The HDOP to set.
Note: The valid range of HDOP is 0.0 to 1.0.

### WITHSATELLITES
Sets the number of satellites of the device. Its argument is:
- Satellites (int) : The number of satellites to set.
Note: The argument should be greater than 0.

### WITHALTITUDE
Sets the altitude of the device. Its argument is:
- Altitude (double) : The altitude to set in meters.
Note: The argument should be greater than 0.

### WITHPARAM
Sets the value of a parameter. Its arguments are:
- Name (string) : The name of the parameter to set.
- Value (any) : The value of the parameter to set.

### WAIT
Waits for the specified amount of time. Its argument is:
- Time (int) : The time to wait in minutes.
Note: The argument should be greater than 0.

### ATDIRECTION
Sets the direction of the device. Its argument is:
- Direction (double) : The direction to set in degrees.
Note: The argument should be between 0 and 360.
Note 2: You can set it as AUTO to calculate the direction using `p1` and `p2` where `p1` is the previous position and `p2` is the current position.

## Known issues
- The command `WITHPARAM` has a bug that makes the second argument from the snippet "valid". Be careful!