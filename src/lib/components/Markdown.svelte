<script lang="ts">
	import { marked } from 'marked';
	export let content: string = '';
</script>

<div class="markdown">
	{@html marked.parse(content, { async: false, breaks: true, gfm: true })}
</div>

<style lang="postcss">
	.markdown :global(h1) {
		@apply scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl;
	}

	.markdown :global(h2) {
		@apply mt-10 scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0;
	}

	.markdown :global(h3) {
		@apply mt-8 scroll-m-20 text-2xl font-semibold tracking-tight;
	}

	.markdown :global(p) {
		@apply leading-7 [&:not(:first-child)]:mt-6;
	}

	.markdown :global(ul) {
		@apply my-6 ml-6 list-disc;
	}

	.markdown :global(li) {
		@apply mt-2;
	}

	.markdown :global(blockquote) {
		@apply mt-6 border-l-2 pl-6 italic;
	}

	.markdown :global(a) {
		@apply font-medium text-primary underline underline-offset-4;
	}

	.markdown :global(table) {
		@apply my-6 w-full overflow-y-auto;
	}

	.markdown :global(tr) {
		@apply m-0 border-t p-0 even:bg-muted;
	}

	.markdown :global(th) {
		@apply border px-4 py-2 text-left font-bold;
	}

	.markdown :global(td) {
		@apply border px-4 py-2 text-left;
	}
</style>
