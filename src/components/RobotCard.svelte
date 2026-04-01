<script>
	export let robot;

	$: displayName = robot.name || `FRC ${robot.year} Robot`;
	$: gameName = robot.game?.name || (robot.isOffseason ? 'Offseason' : '');
	$: excerpt = robot.description.length > 150
		? robot.description.substring(0, 150) + '...'
		: robot.description;
</script>

<a
	href="/robots/{robot.slug}/"
	class="group block bg-gray-800 rounded-xl overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all hover:shadow-xl hover:shadow-blue-900/20"
>
	<div class="flex flex-col md:flex-row">
		<div class="w-full md:w-72 h-48 md:h-auto flex-shrink-0 bg-gray-900">
			<img
				src={robot.image}
				alt={displayName}
				class="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
				loading="lazy"
			/>
		</div>
		<div class="p-5 md:p-6 flex flex-col justify-center flex-1 min-w-0">
			<div class="flex items-center gap-3 mb-2">
				<span class="bg-blue-600 text-white text-sm font-bold px-3 py-1 rounded-full">
					{robot.year}
				</span>
				{#if gameName}
					<span class="text-gray-400 text-sm">{gameName}</span>
				{/if}
			</div>
			<h2 class="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
				{displayName}
			</h2>
			<p class="text-gray-400 text-sm leading-relaxed mb-3">{excerpt}</p>
			{#if robot.awards && robot.awards.length > 0}
				<div class="flex flex-wrap gap-2 mb-2">
					{#each robot.awards.slice(0, 2) as award}
						<span class="text-xs bg-blue-900 text-blue-300 px-2 py-1 rounded">
							{award.name}
						</span>
					{/each}
					{#if robot.awards.length > 2}
						<span class="text-xs bg-gray-700 text-gray-400 px-2 py-1 rounded">
							+{robot.awards.length - 2} more
						</span>
					{/if}
				</div>
			{/if}
			<span class="text-blue-400 text-sm font-medium group-hover:underline">
				View Details &rarr;
			</span>
		</div>
	</div>
</a>
