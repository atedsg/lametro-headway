// data/signals.mjs

export const signalsData = [
  {
    term: 'Rule 3060 - Solid Green',
    fullDefinition: 'Proceed on a normal route into normal traffic in accordance with Cab Signal indications. Trains operating without Cab Signals shall STOP and contact Control.',
    requiredKeywords: ['normal route', 'normal traffic', 'cab signal'],
  },
  {
    term: 'Rule 3060 - Flashing Green',
    fullDefinition: 'Proceed on a normal route into reverse traffic in accordance with Cab Signal indications. Trains operating without Cab Signals shall STOP and contact Control.',
    requiredKeywords: ['normal route', 'reverse traffic', 'cab signal'],
  },
  {
    term: 'Rule 3060 - Solid Yellow',
    fullDefinition: 'Proceed on a diverging route into normal traffic in accordance with Cab Signal indications. Trains operating without Cab Signals shall STOP and contact Control.',
    requiredKeywords: ['diverging route', 'normal traffic', 'cab signal'],
  },
  {
    term: 'Rule 3060 - Flashing Yellow',
    fullDefinition: 'Proceed on a diverging route into reverse traffic in accordance with Cab Signal indications. Trains operating without Cab Signals shall STOP and contact Control.',
    requiredKeywords: ['diverging route', 'reverse traffic', 'cab signal'],
  },
  {
    term: 'Rule 3060 - Flashing Red',
    fullDefinition: 'STOP and contact Control. Proceed when authorized by Control.',
    requiredKeywords: ['stop', 'contact control', 'authorized'],
  },
  {
    term: 'Rule 3060 - Solid Red',
    fullDefinition: 'Stop and contact Control.',
    requiredKeywords: ['stop', 'contact control'],
  },

  // --- Rule 3070 (Blue and EXPO Lines) ---
  {
    term: 'Rule 3070 - Flashing Green Over Red',
    fullDefinition: 'Block clear. Proceed with normal switch position in accordance with Cab Signal indications. Trains operating without CAB SIGNALS prepare to stop at the next signal.',
    requiredKeywords: ['block clear', 'normal switch position', 'cab signal'],
  },
  {
    term: 'Rule 3070 - Red Over Flashing Green',
    fullDefinition: 'Block clear. Proceed with reverse switch position in accordance with Cab Signal indications. Trains operating without CAB SIGNALS prepare to stop at the next signal.',
    requiredKeywords: ['block clear', 'reverse switch position', 'cab signal'],
  },
  {
    term: 'Rule 3070 - Green Over Red',
    fullDefinition: 'Block Occupied. Proceed with normal switch position in accordance with Cab Signal indications. Trains operating without CAB SIGNALS shall STOP and contact Control.',
    requiredKeywords: ['block occupied', 'normal switch position', 'cab signal'],
  },
  {
    term: 'Rule 3070 - Red Over Green',
    fullDefinition: 'Block Occupied. Proceed with reverse switch position in accordance with Cab Signal indications. Trains operating without CAB SIGNALS shall STOP and contact Control.',
    requiredKeywords: ['block occupied', 'reverse switch position', 'cab signal'],
  },
  {
    term: 'Rule 3070 - Lunar Over Red',
    fullDefinition: 'Street Running Territory. Proceed with normal switch position. Operate on sight.',
    requiredKeywords: ['street running', 'normal switch position', 'operate on sight'],
  },
  {
    term: 'Rule 3070 - Red Over Lunar',
    fullDefinition: 'Street Running Territory. Proceed with reverse switch position. Operate on sight.',
    requiredKeywords: ['street running', 'reverse switch position', 'operate on sight'],
  },
  {
    term: 'Rule 3070 - Red Over Red',
    fullDefinition: 'STOP. Contact Control.',
    requiredKeywords: ['stop', 'contact control'],
  },
  {
    term: 'Rule 3070 - Flashing Red Over Red',
    fullDefinition: 'STOP. Contact Control for instructions. When authorized by Control, proceed with normal switch position.',
    requiredKeywords: ['stop', 'contact control', 'normal switch position'],
  },
  {
    term: 'Rule 3070 - Red Over Flashing Red',
    fullDefinition: 'STOP. Contact Control for instructions. When authorized by Control, proceed with reverse switch position.',
    requiredKeywords: ['stop', 'contact control', 'reverse switch position'],
  },

  // --- Rule 3080 to 3089 Special Signals ---
  {
    term: 'Rule 3080 - Green',
    fullDefinition: 'Proceed.',
    requiredKeywords: ['proceed'],
  },
  {
    term: 'Rule 3080 - Red',
    fullDefinition: "STOP. If signal doesn't change to green within 60 seconds, contact Control.",
    requiredKeywords: ['stop', '60 seconds', 'contact control'],
  },
  {
    term: 'Rule 3082 - Red (Reverse to Street Running)',
    fullDefinition: 'STOP. Contact Control for authorization to proceed; a Clearance Card is not required.',
    requiredKeywords: ['stop', 'contact control', 'clearance card'],
  },
  {
    term: 'Rule 3082 - Red Over Red',
    fullDefinition: 'STOP. Contact Control.',
    requiredKeywords: ['stop', 'contact control'],
  },
  {
    term: 'Rule 3082 - Flashing Green Over Red',
    fullDefinition: 'Proceed.',
    requiredKeywords: ['proceed'],
  },
  {
    term: 'Rule 3084 - Green',
    fullDefinition: 'Normal switch position.',
    requiredKeywords: ['normal switch position'],
  },
  {
    term: 'Rule 3084 - Yellow',
    fullDefinition: 'Reverse switch position.',
    requiredKeywords: ['reverse switch position'],
  },
  {
    term: 'Rule 3086 - Green',
    fullDefinition: 'Proceed. Ventilation block ahead is unoccupied. If operating with ATP bypassed, STOP and contact Control.',
    requiredKeywords: ['proceed', 'ventilation block', 'unoccupied'],
  },
  {
    term: 'Rule 3086 - Red',
    fullDefinition: 'STOP. Contact Control. Ventilation block ahead occupied.',
    requiredKeywords: ['stop', 'contact control', 'ventilation block ahead occupied'],
  },
  {
    term: 'Rule 3088 - Green',
    fullDefinition: 'Proceed. Traffic signal pre-emption working, follow Bar Signal indications.',
    requiredKeywords: ['proceed', 'pre-emption working', 'bar signal'],
  },
  {
    term: 'Rule 3088 - Flashing Red',
    fullDefinition: 'STOP. Contact Control. Traffic pre-emption not working, when authorized to proceed follow Bar Signal indications.',
    requiredKeywords: ['stop', 'contact control', 'pre-emption not working', 'bar signal'],
  },
  {
    term: 'Rule 3088 - Red',
    fullDefinition: 'STOP. Contact Control. Block occupied. When authorized to proceed follow Bar Signal indications.',
    requiredKeywords: ['stop', 'contact control', 'block occupied', 'bar signal'],
  },
  {
    term: 'Rule 3089 - Green',
    fullDefinition: 'Proceed. Station platform ahead is unoccupied.',
    requiredKeywords: ['proceed', 'station platform ahead is unoccupied'],
  },
  {
    term: 'Rule 3089 - Red',
    fullDefinition: 'STOP. Contact Control. Station platform ahead is occupied.',
    requiredKeywords: ['stop', 'contact control', 'station platform ahead is occupied'],
  },

  // --- Rule 3090 to 3120 ---
  {
    term: 'Rule 3090 - Flashing Lunar',
    fullDefinition: 'STOP. Train is properly berthed in the station.',
    requiredKeywords: ['stop', 'properly berthed'],
  },
  {
    term: 'Rule 3092 - Lunar White Vertical Bar',
    fullDefinition: 'Proceed through intersection, operating on sight.',
    requiredKeywords: ['proceed through intersection', 'operate on sight'],
  },
  {
    term: 'Rule 3092 - Lunar White Diagonal Bar',
    fullDefinition: 'STOP before entering intersection, if unable to STOP operate on sight.',
    requiredKeywords: ['stop before entering intersection', 'operate on sight'],
  },
  {
    term: 'Rule 3092 - Lunar White Horizontal Bar',
    fullDefinition: 'STOP.',
    requiredKeywords: ['stop'],
  },
  {
    term: 'Rule 3092 - Lunar White Flashing Horizontal Bar',
    fullDefinition: 'STOP. Contact Control.',
    requiredKeywords: ['stop', 'contact control'],
  },
  {
    term: 'Rule 3094 - Solid Yellow / Lunar White',
    fullDefinition: 'Reduced speed. Prepare to STOP.',
    requiredKeywords: ['reduced speed', 'prepare to stop'],
  },
  {
    term: 'Rule 3094 - Flashing Yellow / Lunar White',
    fullDefinition: 'Resume normal speed, crossing gates are down and locked.',
    requiredKeywords: ['resume normal speed', 'down and locked'],
  },
  {
    term: 'Rule 3102 - Blue Line Yard Loop Yellow',
    fullDefinition: 'Proceed, operate on sight.',
    requiredKeywords: ['proceed', 'operate on sight'],
  },
  {
    term: 'Rule 3102 - Blue Line Yard Loop Flashing Red',
    fullDefinition: 'STOP. Contact Yard Control.',
    requiredKeywords: ['stop', 'contact yard control'],
  },
  {
    term: 'Rule 3104 - Red/Purple Line Yard Green',
    fullDefinition: 'Route aligned. Contact Yard Control for authorization to proceed.',
    requiredKeywords: ['route aligned', 'contact yard control'],
  },
  {
    term: 'Rule 3104 - Red/Purple Line Yard Red',
    fullDefinition: 'STOP. Contact Yard Control.',
    requiredKeywords: ['stop', 'contact yard control'],
  },
  {
    term: 'Rule 3106/3108 - Yard Switch Target Green',
    fullDefinition: 'Switch aligned in Normal Position.',
    requiredKeywords: ['normal position'],
  },
  {
    term: 'Rule 3106/3108 - Yard Switch Target Yellow',
    fullDefinition: 'Switch aligned in Reverse Position.',
    requiredKeywords: ['reverse position'],
  },
  {
    term: 'Rule 3110 - Bumping Post Red',
    fullDefinition: 'STOP, end of track.',
    requiredKeywords: ['stop', 'end of track'],
  },
  {
    term: 'Rule 3120 - Sign: AB',
    fullDefinition: 'Trains operating without Cab Signals, apply brakes expecting to encounter an Interlocking Signal indicating STOP ahead.',
    requiredKeywords: ['apply brakes', 'interlocking signal', 'stop ahead'],
  },
  {
    term: 'Rule 3120 - Sign: Speed Limit',
    fullDefinition: 'Maximum allowable speed.',
    requiredKeywords: ['maximum allowable speed'],
  },
];