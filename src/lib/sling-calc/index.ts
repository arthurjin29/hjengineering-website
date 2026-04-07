import type { SharedInputs, ConfigInputs, CalcResult, ConfigType } from './types';
export type { SharedInputs, ConfigInputs, CalcResult, ConfigType } from './types';
export { CONFIG_LABELS } from './types';

import { calculate as calcDirect } from './calc-direct';
import { calculate as calcSpreader } from './calc-spreader';
import { calculate as calcStinger } from './calc-stinger';
import { calculate as calcLiftBeam } from './calc-liftbeam';
import { calculate as calcDoublePar } from './calc-double-par';
import { calculate as calcDoubleCas } from './calc-double-cas';

const modules: Record<ConfigType, (shared: SharedInputs, config: ConfigInputs) => CalcResult> = {
	'direct': calcDirect,
	'spreader-beam': calcSpreader,
	'stinger': calcStinger,
	'lifting-beam': calcLiftBeam,
	'double-parallel': calcDoublePar,
	'double-cascade': calcDoubleCas
};

export function calculate(configType: ConfigType, shared: SharedInputs, config: ConfigInputs): CalcResult {
	const mod = modules[configType];
	if (!mod) throw new Error(`Unknown configuration type: ${configType}`);
	return mod(shared, config);
}
