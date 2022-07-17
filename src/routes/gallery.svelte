<script>
	import Navbar from '../components/navbar.svelte';
	import Footer from '../components/footer.svelte';

	import { onMount } from 'svelte';

	let Carousel; // for saving Carousel component class
	let carousel; // for calling methods of the carousel instance
	onMount(async () => {
		const module = await import('svelte-carousel');
		Carousel = module.default;
	});

	let urls = {
		'2022': [
			'/img/dcmp_team.jpg',
			'/img/gallery/2022/_36A0001.webp',
			'/img/gallery/2022/_36A0017.webp',
			'/img/gallery/2022/_36A0028.webp',
			'/img/gallery/2022/_36A9638.webp',
			'/img/gallery/2022/_36A9642.webp',
			'/img/gallery/2022/_36A9644.webp',
			'/img/gallery/2022/_36A9645.webp',
			'/img/gallery/2022/_36A9646.webp',
			'/img/gallery/2022/_36A9648.webp',
			'/img/gallery/2022/_36A9650.webp',
			'/img/gallery/2022/_36A9654.webp',
			'/img/gallery/2022/_36A9659.webp',
			'/img/gallery/2022/_36A9660.webp',
			'/img/gallery/2022/_36A9662.webp',
			'/img/gallery/2022/_36A9677.webp',
			'/img/gallery/2022/_36A9678.webp',
			'/img/gallery/2022/_36A9682.webp',
			'/img/gallery/2022/_36A9684.webp',
			'/img/gallery/2022/_36A9689.webp',
			'/img/gallery/2022/_36A9691.webp',
			'/img/gallery/2022/_36A9692.webp',
			'/img/gallery/2022/_36A9693.webp',
			'/img/gallery/2022/_36A9695.webp',
			'/img/gallery/2022/_36A9697.webp',
			'/img/gallery/2022/_36A9701.webp',
			'/img/gallery/2022/_36A9703.webp',
			'/img/gallery/2022/_36A9706.webp',
			'/img/gallery/2022/_36A9708.webp',
			'/img/gallery/2022/_36A9710.webp',
			'/img/gallery/2022/_36A9711.webp',
			'/img/gallery/2022/_36A9717.webp',
			'/img/gallery/2022/_36A9720.webp',
			'/img/gallery/2022/_36A9724.webp',
			'/img/gallery/2022/_36A9728.webp',
			'/img/gallery/2022/_36A9731.webp',
			'/img/gallery/2022/_36A9732.webp',
			'/img/gallery/2022/_36A9736.webp',
			'/img/gallery/2022/_36A9740.webp',
			'/img/gallery/2022/_36A9741.webp',
			'/img/gallery/2022/_36A9745.webp',
			'/img/gallery/2022/_36A9793.webp',
			'/img/gallery/2022/_36A9799.webp',
			'/img/gallery/2022/_36A9801.webp',
			'/img/gallery/2022/_36A9813.webp',
			'/img/gallery/2022/_36A9819.webp',
			'/img/gallery/2022/_36A9827.webp',
			'/img/gallery/2022/_36A9838.webp',
			'/img/gallery/2022/_36A9843.webp',
			'/img/gallery/2022/_36A9885.webp',
			'/img/gallery/2022/_36A9895.webp',
			'/img/gallery/2022/_36A9897.webp',
			'/img/gallery/2022/_36A9898.webp',
			'/img/gallery/2022/_36A9905.webp',
			'/img/gallery/2022/_36A9906.webp',
			'/img/gallery/2022/_36A9909.webp',
			'/img/gallery/2022/_36A9911.webp',
			'/img/gallery/2022/_36A9924.webp',
			'/img/gallery/2022/_36A9945.webp',
			'/img/gallery/2022/_36A9954.webp',
			'/img/gallery/2022/_36A9987.webp',
			'/img/gallery/2022/_36A9994.webp',
			'/img/gallery/2022/20220409-DSC01375.webp',
			'/img/gallery/2022/20220409-DSC01281.webp',
			'/img/gallery/2022/20220409-DSC01349.webp',
			'/img/gallery/2022/20220409-DSC01388.webp',
			'/img/gallery/2022/20220409-DSC01405.webp',
			'/img/gallery/2022/20220409-DSC01409.webp',
			'/img/gallery/2022/20220409-DSC01418.webp',
			'/img/gallery/2022/20220409-DSC01395.webp'
		],
		'2019': [
			'/img/gallery/2019/DSC_7196.webp',
			'/img/gallery/2019/DSC_7198.webp',
			'/img/gallery/2019/DSC_7200.webp',
			'/img/gallery/2019/DSC_7203.webp',
			'/img/gallery/2019/DSC_7205.webp',
			'/img/gallery/2019/DSC_7213.webp',
			'/img/gallery/2019/DSC_7221.webp',
			'/img/gallery/2019/DSC_7226.webp',
			'/img/gallery/2019/DSC_7230.webp',
			'/img/gallery/2019/DSC_7236.webp',
			'/img/gallery/2019/DSC_7238.webp',
			'/img/gallery/2019/DSC_7242.webp',
			'/img/gallery/2019/DSC_7246.webp',
			'/img/gallery/2019/DSC_7252.webp',
			'/img/gallery/2019/DSC_7255.webp',
			'/img/gallery/2019/DSC_7259.webp',
			'/img/gallery/2019/DSC_7262.webp',
			'/img/gallery/2019/DSC_7264.webp',
			'/img/gallery/2019/DSC_7266.webp',
			'/img/gallery/2019/DSC_7269.webp',
			'/img/gallery/2019/DSC_7274.webp',
			'/img/gallery/2019/DSC_7278.webp',
			'/img/gallery/2019/DSC_7283.webp',
			'/img/gallery/2019/DSC_7288.webp',
			'/img/gallery/2019/DSC_7292.webp',
			'/img/gallery/2019/DSC_7295.webp',
			'/img/gallery/2019/DSC_7296.webp',
			'/img/gallery/2019/DSC_7301.webp',
			'/img/gallery/2019/DSC_7303.webp',
			'/img/gallery/2019/DSC_7308.webp',
			'/img/gallery/2019/DSC_7318.webp',
			'/img/gallery/2019/DSC_7321.webp',
			'/img/gallery/2019/DSC_7335.webp',
			'/img/gallery/2019/DSC_7336.webp',
			'/img/gallery/2019/DSC_7339.webp',
			'/img/gallery/2019/DSC_7343.webp',
			'/img/gallery/2019/DSC_7345.webp',
			'/img/gallery/2019/DSC_7348.webp',
			'/img/gallery/2019/DSC_7365.webp',
			'/img/gallery/2019/DSC_7367.webp',
			'/img/gallery/2019/DSC_7379.webp',
			'/img/gallery/2019/DSC_7385.webp',
			'/img/gallery/2019/DSC_7393.webp',
			'/img/gallery/2019/IMG_1970.webp',
			'/img/gallery/2019/IMG_1981.webp',
			'/img/gallery/2019/IMG_1992.webp',
			'/img/gallery/2019/IMG_2008.webp',
			'/img/gallery/2019/IMG_2015.webp',
			'/img/gallery/2019/IMG_20190316_103839854_Looney.webp',
			'/img/gallery/2019/IMG_20190316_104104476_Looney.webp',
			'/img/gallery/2019/IMG_20190316_104803677_Looney.webp',
			'/img/gallery/2019/IMG_20190316_105157182_Looney.webp',
			'/img/gallery/2019/IMG_20190316_113451371_Looney.webp',
			'/img/gallery/2019/IMG_20190316_113807462_Looney.webp',
			'/img/gallery/2019/IMG_20190316_114459280_Looney.webp',
			'/img/gallery/2019/IMG_20190316_120043874_Looney.webp',
			'/img/gallery/2019/IMG_20190317_123100282_Looney.webp',
			'/img/gallery/2019/IMG_2022.webp',
			'/img/gallery/2019/IMG_2117.webp',
			'/img/gallery/2019/IMG_2131.webp',
			'/img/gallery/2019/IMG_2142.webp',
			'/img/gallery/2019/IMG_2169.webp',
			'/img/gallery/2019/IMG_5080.webp',
			'/img/gallery/2019/IMG_5094.webp'
		],
		'2018': [
			'/img/gallery/2018/IMG_2401.webp',
			'/img/gallery/2018/IMG_2406.webp',
			'/img/gallery/2018/IMG_2408.webp',
			'/img/gallery/2018/IMG_2418.webp',
			'/img/gallery/2018/IMG_2427.webp',
			'/img/gallery/2018/IMG_2429.webp',
			'/img/gallery/2018/IMG_4395.webp',
			'/img/gallery/2018/IMG_4405.webp',
			'/img/gallery/2018/IMG_4408.webp',
			'/img/gallery/2018/IMG_4419.webp',
			'/img/gallery/2018/IMG_4487.webp',
			'/img/gallery/2018/IMG_4497.webp',
			'/img/gallery/2018/IMG_4525.webp',
			'/img/gallery/2018/IMG_4599.webp'
		],
		'2017': [
			'/img/gallery/2017/33129322773_4f835ae615_o.webp',
			'/img/gallery/2017/33812064451_b266426225_o.webp',
			'/img/gallery/2017/DSC_8353.webp',
			'/img/gallery/2017/DSC_8360.webp',
			'/img/gallery/2017/DSC_8363.webp',
			'/img/gallery/2017/DSC_8372.webp',
			'/img/gallery/2017/DSC_8378.webp',
			'/img/gallery/2017/DSC_8379.webp',
			'/img/gallery/2017/DSC_8392.webp',
			'/img/gallery/2017/DSC_8395.webp',
			'/img/gallery/2017/DSC_8401.webp',
			'/img/gallery/2017/DSC_8409.webp',
			'/img/gallery/2017/DSC_8414.webp',
			'/img/gallery/2017/DSC_8421.webp',
			'/img/gallery/2017/DSC_8428.webp',
			'/img/gallery/2017/DSC_8432.webp',
			'/img/gallery/2017/DSC_8437.webp',
			'/img/gallery/2017/DSC_8443.webp',
			'/img/gallery/2017/DSC_8451.webp',
			'/img/gallery/2017/DSC_8457.webp',
			'/img/gallery/2017/DSC_8467.webp',
			'/img/gallery/2017/DSC_8479.webp',
			'/img/gallery/2017/DSC_8491.webp',
			'/img/gallery/2017/DSC_8496.webp',
			'/img/gallery/2017/DSC_8502.webp',
			'/img/gallery/2017/DSC_8504.webp',
			'/img/gallery/2017/DSC_8509.webp',
			'/img/gallery/2017/DSC_8516.webp',
			'/img/gallery/2017/DSC_8521.webp',
			'/img/gallery/2017/DSC_8527.webp',
			'/img/gallery/2017/DSC_8533.webp',
			'/img/gallery/2017/DSC_8537.webp',
			'/img/gallery/2017/DSC_8548.webp',
			'/img/gallery/2017/DSC_8554.webp',
			'/img/gallery/2017/DSC_8560.webp',
			'/img/gallery/2017/DSC_8566.webp',
			'/img/gallery/2017/DSC_8574.webp',
			'/img/gallery/2017/DSC_8590.webp',
			'/img/gallery/2017/DSC_8596.webp',
			'/img/gallery/2017/DSC_8603.webp',
			'/img/gallery/2017/DSC_8608.webp',
			'/img/gallery/2017/DSC_8613.webp',
			'/img/gallery/2017/DSC_8621.webp',
			'/img/gallery/2017/DSC_8627.webp',
			'/img/gallery/2017/DSC_8629.webp',
			'/img/gallery/2017/DSC_8641.webp',
			'/img/gallery/2017/DSC_8646.webp',
			'/img/gallery/2017/DSC_8668.webp',
			'/img/gallery/2017/FRCSmithfieldRI3-2017S(16).webp',
			'/img/gallery/2017/FRCSmithfieldRI3-2017S(38).webp',
			'/img/gallery/2017/FRCSmithfieldRI32017S(3).webp',
			'/img/gallery/2017/FRCSmithfieldRI3-2017S(50).webp',
			'/img/gallery/2017/FRCSmithfieldRI3-2017S(9).webp',
			'/img/gallery/2017/FRCUNHChampionship4-2017(15).webp',
			'/img/gallery/2017/FRCUNHChampionship4-2017(20).webp',
			'/img/gallery/2017/FRCUNHChampionship4-2017(26).webp',
			'/img/gallery/2017/FRCUNHChampionship4-2017(4).webp',
			'/img/gallery/2017/IMG_4774.webp',
			'/img/gallery/2017/IMG_4777.webp',
			'/img/gallery/2017/IMG_4792.webp',
			'/img/gallery/2017/IMG_4797.webp',
			'/img/gallery/2017/IMG_4803.webp',
			'/img/gallery/2017/IMG_4807.webp'
		],
		'2020': [
			'/img/gallery/2020/IMG_0067.webp',
			'/img/gallery/2020/IMG_0071.webp',
			'/img/gallery/2020/IMG_0072.webp',
			'/img/gallery/2020/IMG_0073.webp',
			'/img/gallery/2020/IMG_0196.webp',
			'/img/gallery/2020/IMG_0198.webp',
			'/img/gallery/2020/IMG_0202.webp',
			'/img/gallery/2020/IMG_0203.webp',
			'/img/gallery/2020/IMG_0207.webp',
			'/img/gallery/2020/IMG_0208.webp',
			'/img/gallery/2020/IMG_0209.webp',
			'/img/gallery/2020/IMG_0219.webp',
			'/img/gallery/2020/IMG_0220.webp',
			'/img/gallery/2020/IMG_0221.webp',
			'/img/gallery/2020/IMG_4974.webp'
		],
		'2016': [
			'/img/gallery/2016/Boston-1.webp',
			'/img/gallery/2016/Boston-3.webp',
			'/img/gallery/2016/DSC_0007.webp',
			'/img/gallery/2016/DSC_0011.webp',
			'/img/gallery/2016/DSC_0015.webp',
			'/img/gallery/2016/DSC_0021.webp',
			'/img/gallery/2016/DSC_0027.webp',
			'/img/gallery/2016/DSC_0032.webp',
			'/img/gallery/2016/DSC_0037.webp',
			'/img/gallery/2016/DSC_0041.webp',
			'/img/gallery/2016/DSC_0053.webp',
			'/img/gallery/2016/DSC_0055.webp',
			'/img/gallery/2016/DSC_0067.webp',
			'/img/gallery/2016/DSC_0073.webp',
			'/img/gallery/2016/DSC_0079.webp',
			'/img/gallery/2016/DSC_0086.webp',
			'/img/gallery/2016/DSC_0091.webp',
			'/img/gallery/2016/DSC_0104.webp',
			'/img/gallery/2016/DSC_0113.webp',
			'/img/gallery/2016/DSC_0114.webp',
			'/img/gallery/2016/DSC_0119.webp',
			'/img/gallery/2016/DSC_9863.webp',
			'/img/gallery/2016/DSC_9868.webp',
			'/img/gallery/2016/DSC_9870.webp',
			'/img/gallery/2016/DSC_9876.webp',
			'/img/gallery/2016/DSC_9916.webp',
			'/img/gallery/2016/DSC_9947.webp',
			'/img/gallery/2016/DSC_9954.webp',
			'/img/gallery/2016/DSC_9959.webp',
			'/img/gallery/2016/DSC_9967.webp',
			'/img/gallery/2016/DSC_9969.webp',
			'/img/gallery/2016/DSC_9974.webp',
			'/img/gallery/2016/DSC_9979.webp',
			'/img/gallery/2016/DSC_9984.webp',
			'/img/gallery/2016/DSC_9991.webp',
			'/img/gallery/2016/DSC_9996.webp',
			'/img/gallery/2016/IMG_1454.webp',
			'/img/gallery/2016/IMG_1490.webp',
			'/img/gallery/2016/IMG_1496.webp',
			'/img/gallery/2016/IMG_1510.webp',
			'/img/gallery/2016/IMG_5592.webp',
			'/img/gallery/2016/IMG_5599.webp',
			'/img/gallery/2016/IMG_5603.webp',
			'/img/gallery/2016/IMG_5607.webp'
		]
	};
</script>

<Navbar />

<div class="w-full min-h-screen bg-slate-900 text-white">
	<br />
	<h3 class="w-full text-center text-5xl">2022: Rapid React</h3>
	<div class="rounded-xl p-4 drop-shadow-sm bg-slate-800 m-4">
		<svelte:component
			this={Carousel}
			bind:this={carousel}
			autoplay
			pauseOnFocus
			autoplayProgressVisible
			let:loaded
		>
			{#each urls['2022'] as url, imageIndex}
				<div class="mx-auto my-4 w-full h-full flex items-center justify-center align-center">
					{#if loaded.includes(imageIndex)}
						<img src={url} class="max-h-[70vh]" />
					{/if}
				</div>
			{/each}
		</svelte:component>
	</div>
	<h3 class="w-full text-center text-5xl">2020: Infinite Recharge</h3>
	<h4 class="text-md w-full text-center">
		Note: 2020 was cut short, due to this there is limited team media
	</h4>
	<div class="rounded-xl p-4 drop-shadow-sm bg-slate-800 m-4">
		<svelte:component
			this={Carousel}
			bind:this={carousel}
			autoplay
			pauseOnFocus
			autoplayProgressVisible
			let:loaded
		>
			{#each urls['2020'] as url, imageIndex}
				<div class="mx-auto my-4 w-full h-full flex items-center justify-center align-center">
					{#if loaded.includes(imageIndex)}
						<img src={url} class="max-h-[70vh]" />
					{/if}
				</div>
			{/each}
		</svelte:component>
	</div>
	<h3 class="w-full text-center text-5xl">2019: Deep Space</h3>
	<div class="rounded-xl p-4 drop-shadow-sm bg-slate-800 m-4">
		<svelte:component
			this={Carousel}
			bind:this={carousel}
			autoplay
			pauseOnFocus
			autoplayProgressVisible
			let:loaded
		>
			{#each urls['2019'] as url, imageIndex}
				<div class="mx-auto my-4 w-full h-full flex items-center justify-center align-center">
					{#if loaded.includes(imageIndex)}
						<img src={url} class="max-h-[70vh]" />
					{/if}
				</div>
			{/each}
		</svelte:component>
	</div>
	<h3 class="w-full text-center text-5xl">2018: Power Up</h3>
	<div class="rounded-xl p-4 drop-shadow-sm bg-slate-800 m-4">
		<svelte:component
			this={Carousel}
			bind:this={carousel}
			autoplay
			pauseOnFocus
			autoplayProgressVisible
			let:loaded
		>
			{#each urls['2018'] as url, imageIndex}
				<div class="mx-auto my-4 w-full h-full flex items-center justify-center align-center">
					{#if loaded.includes(imageIndex)}
						<img src={url} class="max-h-[70vh]" />
					{/if}
				</div>
			{/each}
		</svelte:component>
	</div>
	<h3 class="w-full text-center text-5xl">2017: SteamWorks</h3>
	<div class="rounded-xl p-4 drop-shadow-sm bg-slate-800 m-4">
		<svelte:component
			this={Carousel}
			bind:this={carousel}
			autoplay
			pauseOnFocus
			autoplayProgressVisible
			let:loaded
		>
			{#each urls['2017'] as url, imageIndex}
				<div class="mx-auto my-4 w-full h-full flex items-center justify-center align-center">
					{#if loaded.includes(imageIndex)}
						<img src={url} class="max-h-[70vh]" />
					{/if}
				</div>
			{/each}
		</svelte:component>
	</div>
	<h3 class="w-full text-center text-5xl">2016: Stronghold</h3>
	<div class="rounded-xl p-4 drop-shadow-sm bg-slate-800 m-4">
		<svelte:component
			this={Carousel}
			bind:this={carousel}
			autoplay
			pauseOnFocus
			autoplayProgressVisible
			let:loaded
		>
			{#each urls['2016'] as url, imageIndex}
				<div class="mx-auto my-4 w-full h-full flex items-center justify-center align-center">
					{#if loaded.includes(imageIndex)}
						<img src={url} class="max-h-[70vh]" />
					{/if}
				</div>
			{/each}
		</svelte:component>
	</div>
</div>

<Footer />
