import { error } from '@sveltejs/kit';
import { getServiceBySlug } from '$lib/data/services';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const service = getServiceBySlug(params.slug);
	if (!service) {
		error(404, 'Service not found');
	}
	return { service };
};
