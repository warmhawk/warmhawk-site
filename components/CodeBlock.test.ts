import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { CodeBlock } from './CodeBlock';

/**
 * A Tier 1/2 reader scrolling a Guide page should never have to look at raw
 * curl to find out the API isn't required for them — see
 * notes/1-plan/09-07-26-dashboard-nav-and-tier-buyer-docs.md. This pins the
 * fix: every CodeBlock is a native <details>, closed by default, with the
 * real code still present in the DOM (hidden visually, not stripped).
 */
describe('CodeBlock', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders as a <details> element, closed by default', () => {
    const { container } = render(
      createElement(CodeBlock, null, 'curl -X POST https://app.yourcompany.com/v1/domains'),
    );

    const details = container.querySelector('details');
    expect(details).not.toBeNull();
    expect(details).not.toHaveAttribute('open');
  });

  it('shows the generic summary label with no code label passed', () => {
    const { getByText } = render(createElement(CodeBlock, null, 'curl ...'));

    expect(getByText('API details (Tier 0 / self-hosters)')).toBeInTheDocument();
  });

  it('appends the label to the summary when one is passed', () => {
    // createElement's typings require every non-optional prop (children included) on the props
    // object itself, with no allowance for a required prop supplied positionally instead — hence
    // the narrow cast, kept to this one call site rather than loosening CodeBlock's own real props.
    const { getByText } = render(
      createElement(
        CodeBlock as (props: { label?: string; children?: string }) => JSX.Element,
        {
          label: 'Connect a mailbox',
        },
        'curl ...',
      ),
    );

    expect(
      getByText('API details (Tier 0 / self-hosters) · Connect a mailbox'),
    ).toBeInTheDocument();
  });

  it('keeps the real code content in the DOM — hidden by the disclosure, not stripped', () => {
    const code = 'curl -X POST https://app.yourcompany.com/v1/domains';
    const { getByText } = render(createElement(CodeBlock, null, code));

    expect(getByText(code)).toBeInTheDocument();
  });
});
