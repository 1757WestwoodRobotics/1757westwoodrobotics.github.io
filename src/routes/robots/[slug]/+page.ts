import { getAllSlugs, getRobotBySlug, getAdjacentRobots } from '$lib/data/robots';
import { error } from '@sveltejs/kit';
import type { PageLoad, EntryGenerator } from './$types';

export const entries: EntryGenerator = () => {
	return getAllSlugs().map((slug) => ({ slug }));
};

export const load: PageLoad = ({ params }) => {
	const robot = getRobotBySlug(params.slug);
	if (!robot) throw error(404, 'Robot not found');
	const { prev, next } = getAdjacentRobots(params.slug);
	return { robot, prev, next };
};
