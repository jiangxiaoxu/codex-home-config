import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  buildMergeInstallConfig,
  buildPublishedSyncConfig,
  configTomlPolicy,
  orderTopLevelKeys
} = require('../tools/config-toml-ops.cjs');
const TOML = require('@iarna/toml');

function withTempDir(callback) {
  const tempDir = mkdtempSync(join(tmpdir(), 'codex-home-config-test-'));
  try {
    callback(tempDir);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

test('merge-install replaces managed tables, preserves unmanaged keys, and keeps local projects', () => {
  const sourceConfig = {
    model: 'gpt-5.4',
    features: {
      runtime_metrics: true
    },
    notice: {
      hide_full_access_warning: true
    }
  };

  const targetConfig = {
    model: 'gpt-5.3-codex',
    features: {
      runtime_metrics: false,
      guardian_approval: true
    },
    windows: {
      sandbox: 'elevated'
    },
    projects: {
      'C:\\Users\\jxx73\\repo': {
        trust_level: 'trusted'
      }
    }
  };

  assert.deepStrictEqual(
    buildMergeInstallConfig(sourceConfig, targetConfig),
    {
      model: 'gpt-5.4',
      features: {
        runtime_metrics: true
      },
      notice: {
        hide_full_access_warning: true
      },
      windows: {
        sandbox: 'elevated'
      },
      projects: {
        'C:\\Users\\jxx73\\repo': {
          trust_level: 'trusted'
        }
      }
    }
  );
});

test('merge-install always removes notice.model_migrations from the installed result', () => {
  const sourceConfig = {
    features: {
      runtime_metrics: true
    }
  };

  const targetConfig = {
    notice: {
      hide_full_access_warning: true,
      model_migrations: {
        'gpt-5.1-codex-max': 'gpt-5.3-codex'
      }
    }
  };

  assert.deepStrictEqual(
    buildMergeInstallConfig(sourceConfig, targetConfig),
    {
      features: {
        runtime_metrics: true
      },
      notice: {
        hide_full_access_warning: true
      }
    }
  );
});

test('merge-install replaces the complete agents table and removes model_context_window', () => {
  const sourceConfig = {
    model_context_window: 200000,
    agents: {
      reviewer: {
        model: 'gpt-5.4'
      }
    },
    features: {
      runtime_metrics: true
    }
  };

  const targetConfig = {
    model_context_window: 100000,
    agents: {
      stale_local: {
        model: 'gpt-5.3-codex'
      }
    },
    windows: {
      sandbox: 'elevated'
    }
  };

  assert.deepStrictEqual(
    buildMergeInstallConfig(sourceConfig, targetConfig),
    {
      agents: {
        reviewer: {
          model: 'gpt-5.4'
        }
      },
      features: {
        runtime_metrics: true
      },
      windows: {
        sandbox: 'elevated'
      }
    }
  );
});

test('merge-install preserves local agents when the managed snapshot does not define agents', () => {
  const sourceConfig = {
    features: {
      runtime_metrics: true
    }
  };

  const targetConfig = {
    agents: {
      reviewer: {
        model: 'gpt-5.3-codex'
      }
    }
  };

  assert.deepStrictEqual(
    buildMergeInstallConfig(sourceConfig, targetConfig),
    {
      features: {
        runtime_metrics: true
      },
      agents: {
        reviewer: {
          model: 'gpt-5.3-codex'
        }
      }
    }
  );
});

test('merge-install preserves local service_tier and plan_mode_reasoning_effort when the managed snapshot defines them', () => {
  const sourceConfig = {
    model: 'gpt-5.4',
    model_reasoning_effort: 'high',
    service_tier: 'default',
    plan_mode_reasoning_effort: 'xhigh',
    features: {
      runtime_metrics: true
    }
  };

  const targetConfig = {
    model: 'gpt-5.3-codex',
    model_reasoning_effort: 'medium',
    service_tier: 'fast',
    plan_mode_reasoning_effort: 'low',
    windows: {
      sandbox: 'elevated'
    }
  };

  assert.deepStrictEqual(
    buildMergeInstallConfig(sourceConfig, targetConfig),
    {
      model: 'gpt-5.4',
      model_reasoning_effort: 'high',
      features: {
        runtime_metrics: true
      },
      service_tier: 'fast',
      plan_mode_reasoning_effort: 'low',
      windows: {
        sandbox: 'elevated'
      }
    }
  );
});

test('merge-install syncs managed mcp servers by server name and preserves unmanaged local servers', () => {
  const sourceConfig = {
    mcp_servers: {
      lm_tools_bridge: {
        command: 'powershell.exe',
        args: [
          '-NoProfile',
          '-Command',
          'node "managed.js"'
        ],
        tool_timeout_sec: 120
      },
      openaiDeveloperDocs: {
        url: 'https://developers.openai.com/mcp'
      }
    }
  };

  const targetConfig = {
    mcp_servers: {
      lm_tools_bridge: {
        command: 'pwsh.exe',
        args: [
          '-NoProfile',
          '-Command',
          'node "local.js"'
        ],
        tool_timeout_sec: 30
      },
      custom_local: {
        url: 'https://localhost:4000/mcp'
      }
    }
  };

  assert.deepStrictEqual(
    buildMergeInstallConfig(sourceConfig, targetConfig),
    {
      mcp_servers: {
        lm_tools_bridge: {
          command: 'powershell.exe',
          args: [
            '-NoProfile',
            '-Command',
            'node "managed.js"'
          ],
          tool_timeout_sec: 120
        },
        openaiDeveloperDocs: {
          url: 'https://developers.openai.com/mcp'
        },
        custom_local: {
          url: 'https://localhost:4000/mcp'
        }
      }
    }
  );
});

test('merge-install preserves local feature values but applies source apps without special handling', () => {
  const sourceConfig = {
    apps: {
      _default: {
        enabled: true
      },
      connector_managed_only: {
        enabled: true
      }
    },
    features: {
      workspace_dependencies: true,
      apps: true,
      unified_exec: true
    }
  };

  const targetConfig = {
    apps: {
      _default: {
        enabled: false
      },
      connector_local_only: {
        enabled: true
      }
    },
    features: {
      workspace_dependencies: false,
      apps: false
    }
  };

  assert.deepStrictEqual(
    buildMergeInstallConfig(sourceConfig, targetConfig),
    {
      apps: {
        _default: {
          enabled: true
        },
        connector_managed_only: {
          enabled: true
        }
      },
      features: {
        workspace_dependencies: false,
        apps: false,
        unified_exec: true
      }
    }
  );
});

test('merge-install omits preserved feature values absent from target without filtering source apps', () => {
  assert.deepStrictEqual(
    buildMergeInstallConfig(
      {
        apps: {
          _default: {
            enabled: false
          },
          connector_managed: {
            enabled: true
          }
        },
        features: {
          workspace_dependencies: false,
          apps: false,
          unified_exec: true
        }
      },
      {}
    ),
    {
      apps: {
        _default: {
          enabled: false
        },
        connector_managed: {
          enabled: true
        }
      },
      features: {
        unified_exec: true
      }
    }
  );
});

test('merge-install preserves all local apps when the managed snapshot has no apps table', () => {
  const targetConfig = {
    apps: {
      _default: {
        enabled: false
      },
      local_app: {
        enabled: true
      }
    }
  };

  assert.deepStrictEqual(
    buildMergeInstallConfig({ features: { unified_exec: true } }, targetConfig),
    {
      features: {
        unified_exec: true
      },
      apps: targetConfig.apps
    }
  );
});

test('merge-install preserves local sandbox_workspace_write.writable_roots as an unmanaged nested path', () => {
  const sourceConfig = {
    sandbox_workspace_write: {
      network_access: true,
      writable_roots: [
        'C:\\managed-only'
      ]
    }
  };

  const targetConfig = {
    sandbox_workspace_write: {
      network_access: false,
      writable_roots: [
        'C:\\local-one',
        'D:\\local-two'
      ]
    }
  };

  assert.deepStrictEqual(
    buildMergeInstallConfig(sourceConfig, targetConfig),
    {
      sandbox_workspace_write: {
        network_access: true,
        writable_roots: [
          'C:\\local-one',
          'D:\\local-two'
        ]
      }
    }
  );
});

test('publish-sync excludes unmanaged top-level keys, projects, and notice.model_migrations', () => {
  const localConfig = {
    model: 'gpt-5.4',
    model_reasoning_effort: 'medium',
    service_tier: 'fast',
    plan_mode_reasoning_effort: 'low',
    agents: {
      reviewer: {
        model: 'gpt-5.4'
      }
    },
    features: {
      runtime_metrics: true,
      guardian_approval: false
    },
    notice: {
      hide_full_access_warning: true,
      model_migrations: {
        'gpt-5.1-codex-max': 'gpt-5.3-codex'
      }
    },
    windows: {
      sandbox: 'elevated'
    },
    projects: {
      sample: {
        trust_level: 'trusted'
      }
    }
  };

  const managedConfig = {
    model: 'gpt-5.3-codex',
    model_reasoning_effort: 'high',
    service_tier: 'default',
    plan_mode_reasoning_effort: 'xhigh',
    features: {
      runtime_metrics: false
    },
    notice: {
      hide_full_access_warning: false,
      model_migrations: {
        'gpt-5.1-codex-max': 'gpt-5.3-codex'
      }
    },
    sandbox_workspace_write: {
      network_access: true
    }
  };

  assert.deepStrictEqual(
    buildPublishedSyncConfig(localConfig, managedConfig),
    {
      features: {
        runtime_metrics: true,
        guardian_approval: false
      },
      notice: {
        hide_full_access_warning: true
      }
    }
  );
});

test('merge-install CLI allows a missing target file and writes UTF-8 TOML output', () => {
  withTempDir((tempDir) => {
    const sourcePath = join(tempDir, 'source.toml');
    const targetPath = join(tempDir, 'missing-target.toml');
    const outputPath = join(tempDir, 'output.toml');

    writeFileSync(
      sourcePath,
      [
        'model = "gpt-5.4"',
        '',
        '[features]',
        'runtime_metrics = true',
        ''
      ].join('\n'),
      'utf8'
    );

    const result = spawnSync(
      process.execPath,
      [
        'tools/config-toml-ops.cjs',
        'merge-install',
        '--source',
        sourcePath,
        '--target',
        targetPath,
        '--output',
        outputPath
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8'
      }
    );

    assert.equal(result.status, 0, result.stderr);
    assert.deepStrictEqual(
      TOML.parse(readFileSync(outputPath, 'utf8')),
      {
        model: 'gpt-5.4',
        features: {
          runtime_metrics: true
        }
      }
    );
  });
});

test('merge-install CLI round-trips an agents profile with config_file', () => {
  withTempDir((tempDir) => {
    const sourcePath = join(tempDir, 'source.toml');
    const targetPath = join(tempDir, 'target.toml');
    const outputPath = join(tempDir, 'output.toml');

    writeFileSync(
      sourcePath,
      [
        '[agents.xxxx]',
        'config_file = "./agents/xxxx.toml"',
        ''
      ].join('\n'),
      'utf8'
    );

    writeFileSync(
      targetPath,
      [
        '[agents.stale_local]',
        'config_file = "./agents/stale-local.toml"',
        ''
      ].join('\n'),
      'utf8'
    );

    const result = spawnSync(
      process.execPath,
      [
        'tools/config-toml-ops.cjs',
        'merge-install',
        '--source',
        sourcePath,
        '--target',
        targetPath,
        '--output',
        outputPath
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8'
      }
    );

    assert.equal(result.status, 0, result.stderr);
    assert.deepStrictEqual(
      TOML.parse(readFileSync(outputPath, 'utf8')),
      {
        agents: {
          xxxx: {
            config_file: './agents/xxxx.toml'
          }
        }
      }
    );
  });
});

test('merge-install CLI preserves the original unmanaged node_repl MCP text while updating managed configuration', () => {
  withTempDir((tempDir) => {
    const sourcePath = join(tempDir, 'source.toml');
    const targetPath = join(tempDir, 'target.toml');
    const outputPath = join(tempDir, 'output.toml');
    const nodeReplBlock = [
      '# Keep this locally generated MCP server exactly as written.',
      '[mcp_servers.node_repl]',
      'args = [] # Preserve this inline comment.',
      "command = 'E:\\Codex-win32-x64\\resources\\cua_node\\bin\\node_repl.exe' # Keep literal quotes.",
      'startup_timeout_sec = 120',
      '',
      '  # Preserve the local environment table and its formatting.',
      '  [mcp_servers.node_repl.env]',
      "  NODE_REPL_NODE_MODULE_DIRS = 'E:\\Codex-win32-x64\\resources\\cua_node\\bin\\node_modules' # Keep literal quotes.",
      '  NODE_REPL_NODE_PATH = "E:\\\\Codex-win32-x64\\\\resources\\\\cua_node\\\\bin\\\\node.exe"',
      "  CODEX_HOME = 'C:\\Users\\local-user\\.codex'",
      ''
    ].join('\r\n');

    writeFileSync(
      sourcePath,
      [
        'model = "gpt-5.6-terra"',
        'approval_policy = "on-request"',
        '',
        '[features]',
        'runtime_metrics = true',
        '',
        '[mcp_servers.managed_bridge]',
        'command = "powershell.exe"',
        'args = ["-NoProfile", "-Command", "managed"]',
        'tool_timeout_sec = 120',
        ''
      ].join('\n'),
      'utf8'
    );

    writeFileSync(
      targetPath,
      [
        'model = "gpt-5.4"',
        'approval_policy = "never"',
        '',
        nodeReplBlock,
        '[mcp_servers.managed_bridge]',
        'command = "pwsh.exe"',
        'args = ["--stale"]',
        'tool_timeout_sec = 30',
        ''
      ].join('\r\n'),
      'utf8'
    );

    const result = spawnSync(
      process.execPath,
      [
        'tools/config-toml-ops.cjs',
        'merge-install',
        '--source',
        sourcePath,
        '--target',
        targetPath,
        '--output',
        outputPath
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8'
      }
    );

    assert.equal(result.status, 0, result.stderr);

    const outputText = readFileSync(outputPath, 'utf8');
    const nodeReplBlockStart = outputText.indexOf(nodeReplBlock);
    assert.notEqual(nodeReplBlockStart, -1, 'node_repl block must retain its original CRLF text');
    assert.equal(
      outputText.slice(nodeReplBlockStart, nodeReplBlockStart + nodeReplBlock.length),
      nodeReplBlock,
      'node_repl block must retain literal quotes, comments, CRLF, and multiline env formatting'
    );

    const outputConfig = TOML.parse(outputText);
    assert.equal(outputConfig.model, 'gpt-5.6-terra');
    assert.equal(outputConfig.approval_policy, 'on-request');
    assert.deepStrictEqual(outputConfig.features, { runtime_metrics: true });
    assert.deepStrictEqual(outputConfig.mcp_servers.managed_bridge, {
      command: 'powershell.exe',
      args: [
        '-NoProfile',
        '-Command',
        'managed'
      ],
      tool_timeout_sec: 120
    });
    assert.equal(
      outputConfig.mcp_servers.node_repl.command,
      'E:\\Codex-win32-x64\\resources\\cua_node\\bin\\node_repl.exe'
    );
    assert.equal(
      outputConfig.mcp_servers.node_repl.env.NODE_REPL_NODE_MODULE_DIRS,
      'E:\\Codex-win32-x64\\resources\\cua_node\\bin\\node_modules'
    );
  });
});

test('merge-install CLI keeps preserved service_tier at the TOML root after a features table', () => {
  withTempDir((tempDir) => {
    const sourcePath = join(tempDir, 'source.toml');
    const targetPath = join(tempDir, 'target.toml');
    const outputPath = join(tempDir, 'output.toml');

    writeFileSync(
      sourcePath,
      [
        'model = "gpt-5.6-terra"',
        'service_tier = "default"',
        '',
        '[features]',
        'runtime_metrics = true',
        ''
      ].join('\n'),
      'utf8'
    );
    writeFileSync(
      targetPath,
      [
        'model = "gpt-5.4"',
        'service_tier = "fast"',
        '',
        '[features]',
        'runtime_metrics = false',
        ''
      ].join('\r\n'),
      'utf8'
    );

    const result = spawnSync(
      process.execPath,
      [
        'tools/config-toml-ops.cjs',
        'merge-install',
        '--source',
        sourcePath,
        '--target',
        targetPath,
        '--output',
        outputPath
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8'
      }
    );

    assert.equal(result.status, 0, result.stderr);
    const outputConfig = TOML.parse(readFileSync(outputPath, 'utf8'));
    assert.equal(outputConfig.service_tier, 'fast');
    assert.equal(Object.hasOwn(outputConfig.features, 'service_tier'), false);
    assert.equal(outputConfig.features.runtime_metrics, true);
  });
});

test('merge-install CLI removes target notice.model_migrations when source has no notice table', () => {
  withTempDir((tempDir) => {
    const sourcePath = join(tempDir, 'source.toml');
    const targetPath = join(tempDir, 'target.toml');
    const outputPath = join(tempDir, 'output.toml');

    writeFileSync(
      sourcePath,
      [
        'model = "gpt-5.6-terra"',
        '',
        '[features]',
        'runtime_metrics = true',
        ''
      ].join('\n'),
      'utf8'
    );
    writeFileSync(
      targetPath,
      [
        'model = "gpt-5.4"',
        '',
        '[notice]',
        'hide_full_access_warning = true',
        '',
        '[notice.model_migrations]',
        '"gpt-5.1-codex-max" = "gpt-5.3-codex"',
        ''
      ].join('\r\n'),
      'utf8'
    );

    const result = spawnSync(
      process.execPath,
      [
        'tools/config-toml-ops.cjs',
        'merge-install',
        '--source',
        sourcePath,
        '--target',
        targetPath,
        '--output',
        outputPath
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8'
      }
    );

    assert.equal(result.status, 0, result.stderr);
    const outputText = readFileSync(outputPath, 'utf8');
    const outputConfig = TOML.parse(outputText);
    assert.deepStrictEqual(outputConfig.notice, { hide_full_access_warning: true });
    assert.equal(Object.hasOwn(outputConfig.notice, 'model_migrations'), false);
    assert.doesNotMatch(outputText, /\[notice\.model_migrations\]/);
  });
});

test('merge-install CLI preserves a target-only inline mcp_servers table', () => {
  withTempDir((tempDir) => {
    const sourcePath = join(tempDir, 'source.toml');
    const targetPath = join(tempDir, 'target.toml');
    const outputPath = join(tempDir, 'output.toml');
    const inlineMcpServers = "mcp_servers = { node_repl = { command = 'node.exe', args = [] } } # Keep this inline table.";

    writeFileSync(sourcePath, 'model = "gpt-5.6-terra"\n', 'utf8');
    writeFileSync(
      targetPath,
      [
        'model = "gpt-5.4"',
        inlineMcpServers,
        ''
      ].join('\r\n'),
      'utf8'
    );

    const result = spawnSync(
      process.execPath,
      [
        'tools/config-toml-ops.cjs',
        'merge-install',
        '--source',
        sourcePath,
        '--target',
        targetPath,
        '--output',
        outputPath
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8'
      }
    );

    assert.equal(result.status, 0, result.stderr);
    const outputText = readFileSync(outputPath, 'utf8');
    assert.match(outputText, new RegExp(`^${inlineMcpServers.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm'));
    assert.deepStrictEqual(TOML.parse(outputText).mcp_servers, {
      node_repl: {
        command: 'node.exe',
        args: []
      }
    });
  });
});

test('merge-install CLI preserves target-only mcp_servers parent and node_repl child tables', () => {
  withTempDir((tempDir) => {
    const sourcePath = join(tempDir, 'source.toml');
    const targetPath = join(tempDir, 'target.toml');
    const outputPath = join(tempDir, 'output.toml');
    const mcpBlock = [
      '[mcp_servers]',
      'enabled = true # Preserve the parent table.',
      '',
      '[mcp_servers.node_repl]',
      "command = 'node.exe' # Preserve the child table.",
      'args = []',
      ''
    ].join('\r\n');

    writeFileSync(sourcePath, 'model = "gpt-5.6-terra"\n', 'utf8');
    writeFileSync(
      targetPath,
      [
        'model = "gpt-5.4"',
        '',
        mcpBlock
      ].join('\r\n'),
      'utf8'
    );

    const result = spawnSync(
      process.execPath,
      [
        'tools/config-toml-ops.cjs',
        'merge-install',
        '--source',
        sourcePath,
        '--target',
        targetPath,
        '--output',
        outputPath
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8'
      }
    );

    assert.equal(result.status, 0, result.stderr);
    const outputText = readFileSync(outputPath, 'utf8');
    assert.ok(outputText.includes(mcpBlock), 'target-only mcp_servers table hierarchy must remain byte-for-byte intact');
    assert.deepStrictEqual(TOML.parse(outputText).mcp_servers, {
      enabled: true,
      node_repl: {
        command: 'node.exe',
        args: []
      }
    });
  });
});

test('merge-install CLI preserves adjacent unchanged managed root assignments and their inline comments', () => {
  withTempDir((tempDir) => {
    const sourcePath = join(tempDir, 'source.toml');
    const targetPath = join(tempDir, 'target.toml');
    const outputPath = join(tempDir, 'output.toml');
    const modelLine = "model = 'gpt-5.6-terra' # Preserve this model comment.";
    const approvalPolicyLine = "approval_policy = 'never' # Preserve this approval comment.";

    writeFileSync(
      sourcePath,
      [
        "model = 'gpt-5.6-terra' # Managed source model comment.",
        "approval_policy = 'never' # Managed source approval comment.",
        ''
      ].join('\n'),
      'utf8'
    );
    writeFileSync(
      targetPath,
      [
        modelLine,
        approvalPolicyLine,
        ''
      ].join('\r\n'),
      'utf8'
    );

    const result = spawnSync(
      process.execPath,
      [
        'tools/config-toml-ops.cjs',
        'merge-install',
        '--source',
        sourcePath,
        '--target',
        targetPath,
        '--output',
        outputPath
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8'
      }
    );

    assert.equal(result.status, 0, result.stderr);
    const outputText = readFileSync(outputPath, 'utf8');
    assert.ok(outputText.includes(`${modelLine}\r\n${approvalPolicyLine}`));
    assert.equal((outputText.match(/# Preserve this model comment\./g) ?? []).length, 1);
    assert.equal((outputText.match(/# Preserve this approval comment\./g) ?? []).length, 1);
    assert.deepStrictEqual(TOML.parse(outputText), {
      model: 'gpt-5.6-terra',
      approval_policy: 'never'
    });
  });
});

test('publish-sync orders managed tables and MCP server children according to local configuration order', () => {
  const localConfig = {
    mcp_servers: {
      zulu: {
        command: 'node-zulu.exe'
      },
      alpha: {
        command: 'node-alpha.exe'
      }
    },
    notice: {
      hide_full_access_warning: true
    },
    features: {
      runtime_metrics: true
    }
  };
  const managedConfig = {
    features: {
      runtime_metrics: false
    },
    notice: {
      hide_full_access_warning: false
    },
    mcp_servers: {
      alpha: {
        command: 'node-alpha.exe'
      },
      zulu: {
        command: 'node-zulu.exe'
      }
    }
  };

  const publishedConfig = buildPublishedSyncConfig(localConfig, managedConfig);
  assert.deepStrictEqual(Object.keys(publishedConfig), [
    'mcp_servers',
    'notice',
    'features'
  ]);
  assert.deepStrictEqual(Object.keys(publishedConfig.mcp_servers), [
    'zulu',
    'alpha'
  ]);
});

test('publish-sync CLI writes managed tables and MCP server children in local configuration order', () => {
  withTempDir((tempDir) => {
    const localPath = join(tempDir, 'local.toml');
    const managedPath = join(tempDir, 'managed.toml');
    const outputPath = join(tempDir, 'output.toml');

    writeFileSync(
      localPath,
      [
        '[mcp_servers.zulu]',
        'command = "node-zulu.exe"',
        '',
        '[mcp_servers.alpha]',
        'command = "node-alpha.exe"',
        '',
        '[notice]',
        'hide_full_access_warning = true',
        '',
        '[features]',
        'runtime_metrics = true',
        ''
      ].join('\r\n'),
      'utf8'
    );
    writeFileSync(
      managedPath,
      [
        '[features]',
        'runtime_metrics = false',
        '',
        '[notice]',
        'hide_full_access_warning = false',
        '',
        '[mcp_servers.alpha]',
        'command = "managed-alpha.exe"',
        '',
        '[mcp_servers.zulu]',
        'command = "managed-zulu.exe"',
        ''
      ].join('\n'),
      'utf8'
    );

    const result = spawnSync(
      process.execPath,
      [
        'tools/config-toml-ops.cjs',
        'publish-sync',
        '--local',
        localPath,
        '--managed',
        managedPath,
        '--output',
        outputPath
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8'
      }
    );

    assert.equal(result.status, 0, result.stderr);
    const outputText = readFileSync(outputPath, 'utf8');
    assert.ok(
      outputText.indexOf('[mcp_servers.zulu]') < outputText.indexOf('[mcp_servers.alpha]') &&
      outputText.indexOf('[mcp_servers.alpha]') < outputText.indexOf('[notice]') &&
      outputText.indexOf('[notice]') < outputText.indexOf('[features]'),
      'publish output must follow local table and MCP child order'
    );
  });
});

test('merge-install CLI writes changed managed sections in source order while retaining raw unmanaged node_repl text', () => {
  withTempDir((tempDir) => {
    const sourcePath = join(tempDir, 'source.toml');
    const targetPath = join(tempDir, 'target.toml');
    const outputPath = join(tempDir, 'output.toml');
    const nodeReplBlock = [
      '# Keep this target-only MCP block raw.',
      '[mcp_servers.node_repl]',
      "command = 'node-repl.exe' # Keep literal quotes and comment.",
      'args = []',
      ''
    ].join('\r\n');

    writeFileSync(
      sourcePath,
      [
        'model = "gpt-5.6-terra"',
        '',
        '[features]',
        'runtime_metrics = true',
        '',
        '[mcp_servers.alpha]',
        'command = "managed-alpha.exe"',
        '',
        '[mcp_servers.zulu]',
        'command = "managed-zulu.exe"',
        ''
      ].join('\n'),
      'utf8'
    );
    writeFileSync(
      targetPath,
      [
        'model = "gpt-5.4"',
        '',
        nodeReplBlock,
        '[mcp_servers.zulu]',
        'command = "stale-zulu.exe"',
        '',
        '[features]',
        'runtime_metrics = false',
        '',
        '[mcp_servers.alpha]',
        'command = "stale-alpha.exe"',
        ''
      ].join('\r\n'),
      'utf8'
    );

    const result = spawnSync(
      process.execPath,
      [
        'tools/config-toml-ops.cjs',
        'merge-install',
        '--source',
        sourcePath,
        '--target',
        targetPath,
        '--output',
        outputPath
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8'
      }
    );

    assert.equal(result.status, 0, result.stderr);
    const outputText = readFileSync(outputPath, 'utf8');
    assert.ok(outputText.includes(nodeReplBlock), 'unmanaged node_repl text must remain raw');
    assert.ok(
      outputText.indexOf('[features]') < outputText.indexOf('[mcp_servers.alpha]') &&
      outputText.indexOf('[mcp_servers.alpha]') < outputText.indexOf('[mcp_servers.zulu]'),
      'changed managed sections must follow source order'
    );
  });
});

test('merge-install CLI normalizes CRLF developer_instructions before writing TOML output', () => {
  withTempDir((tempDir) => {
    const sourcePath = join(tempDir, 'source.toml');
    const targetPath = join(tempDir, 'missing-target.toml');
    const outputPath = join(tempDir, 'output.toml');

    writeFileSync(
      sourcePath,
      [
        'developer_instructions = """',
        'First line',
        '',
        'Second line',
        '"""',
        ''
      ].join('\r\n'),
      'utf8'
    );

    const result = spawnSync(
      process.execPath,
      [
        'tools/config-toml-ops.cjs',
        'merge-install',
        '--source',
        sourcePath,
        '--target',
        targetPath,
        '--output',
        outputPath
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8'
      }
    );

    assert.equal(result.status, 0, result.stderr);
    const outputText = readFileSync(outputPath, 'utf8');
    assert.doesNotMatch(outputText, /\\r/);
    assert.equal(TOML.parse(outputText).developer_instructions.includes('\r'), false);
  });
});

test('orderTopLevelKeys always places model keys before other top-level entries', () => {
  assert.deepStrictEqual(
    Object.keys(orderTopLevelKeys({
      features: {
        runtime_metrics: true
      },
      model_reasoning_effort: 'medium',
      notice: {
        hide_full_access_warning: true
      },
      model: 'gpt-5.4'
    })),
    [
      'model',
      'model_reasoning_effort',
      'features',
      'notice'
    ]
  );
});

test('publish-sync only emits managed mcp servers by server name', () => {
  const localConfig = {
    mcp_servers: {
      lm_tools_bridge: {
        command: 'powershell.exe',
        args: [
          '-NoProfile',
          '-Command',
          'node "local.js"'
        ]
      },
      custom_local: {
        url: 'https://localhost:4000/mcp'
      }
    }
  };

  const managedConfig = {
    mcp_servers: {
      lm_tools_bridge: {
        command: 'powershell.exe',
        args: [
          '-NoProfile',
          '-Command',
          'node "managed.js"'
        ]
      },
      openaiDeveloperDocs: {
        url: 'https://developers.openai.com/mcp'
      }
    }
  };

  assert.deepStrictEqual(
    buildPublishedSyncConfig(localConfig, managedConfig),
    {
      mcp_servers: {
        lm_tools_bridge: {
          command: 'powershell.exe',
          args: [
            '-NoProfile',
            '-Command',
            'node "local.js"'
          ]
        }
      }
    }
  );
});

test('publish-sync excludes the entire apps table even when apps are already managed', () => {
  const localConfig = {
    apps: {
      _default: {
        enabled: true
      },
      connector_managed: {
        enabled: false
      },
      connector_local_only: {
        enabled: true
      }
    }
  };

  const managedConfig = {
    apps: {
      _default: {
        enabled: false
      },
      connector_managed: {
        enabled: true
      },
      connector_published_only: {
        enabled: true
      }
    }
  };

  assert.deepStrictEqual(
    buildPublishedSyncConfig(localConfig, managedConfig),
    {}
  );
});

test('publish-sync excludes apps and locally preserved feature values', () => {
  assert.deepStrictEqual(
    buildPublishedSyncConfig(
      {
        apps: {
          _default: {
            enabled: false
          },
          connector_managed: {
            enabled: true
          }
        },
        features: {
          workspace_dependencies: false,
          apps: false,
          unified_exec: true
        }
      },
      {
        apps: {
          _default: {
            enabled: true
          },
          connector_managed: {
            enabled: false
          }
        },
        features: {
          workspace_dependencies: true,
          apps: true,
          unified_exec: false
        }
      }
    ),
    {
      features: {
        unified_exec: true
      }
    }
  );
});

test('publish-sync excludes apps with the real managed allowlist', () => {
  const managedConfig = TOML.parse(readFileSync(join(process.cwd(), 'managed', 'config.toml'), 'utf8'));
  assert.equal(Object.hasOwn(managedConfig, 'apps'), false);

  assert.deepStrictEqual(
    buildPublishedSyncConfig(
      {
        apps: {
          _default: {
            enabled: false,
            other_setting: 'published'
          },
          unlisted_local_app: {
            enabled: true
          }
        }
      },
      managedConfig
    ),
    {}
  );
});

test('managed config.toml contains no sync-excluded configuration', () => {
  const managedConfig = TOML.parse(readFileSync(join(process.cwd(), 'managed', 'config.toml'), 'utf8'));
  const hasPath = (pathSegments) => {
    let value = managedConfig;
    for (const pathSegment of pathSegments) {
      if (value === null || typeof value !== 'object' || !Object.hasOwn(value, pathSegment)) {
        return false;
      }
      value = value[pathSegment];
    }
    return true;
  };

  for (const key of configTomlPolicy.sync.excludedTopLevelKeys) {
    assert.equal(Object.hasOwn(managedConfig, key), false, `managed/config.toml must exclude ${key}`);
  }

  for (const pathSegments of configTomlPolicy.sync.excludedNestedPaths) {
    assert.equal(hasPath(pathSegments), false, `managed/config.toml must exclude ${pathSegments.join('.')}`);
  }
});

test('README config.toml 同步策略完整记录用户可见的同步排除规则', () => {
  const readme = readFileSync(join(process.cwd(), 'README.md'), 'utf8');
  const sectionMatch = readme.match(/## config\.toml 同步策略\n([\s\S]*?)(?=\n## |$)/);
  assert.notEqual(sectionMatch, null, 'README 必须包含集中的 config.toml 同步策略章节');
  const policySection = sectionMatch[1];
  const exampleMatch = policySection.match(/```toml\n([\s\S]*?)\n```/);
  assert.notEqual(exampleMatch, null, 'README 同步策略必须包含 TOML 示例');
  const exampleConfig = TOML.parse(exampleMatch[1]);
  const pathNames = (paths) => paths.map((pathSegments) => pathSegments.join('.'));
  const exampleHasPath = (pathSegments) => {
    let value = exampleConfig;
    for (const pathSegment of pathSegments) {
      if (value === null || typeof value !== 'object' || !Object.hasOwn(value, pathSegment)) {
        return false;
      }
      value = value[pathSegment];
    }
    return true;
  };
  const policyRows = new Map(
    [...policySection.matchAll(/^\| ([^|]+) \| ([^|]+) \|$/gm)]
      .map((match) => [match[1].trim(), match[2].trim()])
  );
  const localOnlyPaths = pathNames(configTomlPolicy.syncExcludedInstallPreservedNestedPaths);
  const regularExcludedNestedPaths = pathNames(configTomlPolicy.sync.excludedNestedPaths)
    .filter((pathName) => !localOnlyPaths.includes(pathName));
  const installPreservedLocalOnlyPaths = pathNames(configTomlPolicy.install.preservedNestedPaths)
    .filter((pathName) => localOnlyPaths.includes(pathName));
  assert.deepStrictEqual(
    new Set(installPreservedLocalOnlyPaths),
    new Set(localOnlyPaths),
    '所有本地专属配置都必须在安装时保留'
  );
  const expectedNamesByRow = new Map([
    ['顶层配置', configTomlPolicy.sync.excludedTopLevelKeys],
    ['嵌套配置', regularExcludedNestedPaths],
    ['本地专属配置', localOnlyPaths]
  ]);

  for (const policyName of new Set([
    configTomlPolicy.sync.topLevelAllowlistSource,
    ...configTomlPolicy.sync.childAllowlistedTables
  ])) {
    assert.ok(policySection.includes(`\`${policyName}\``), `同步范围说明必须记录 ${policyName}`);
  }

  for (const [rowName, policyNames] of expectedNamesByRow) {
    const rowText = policyRows.get(rowName);
    assert.notEqual(rowText, undefined, `README config.toml 同步策略章节必须包含 ${rowName} 行`);
    for (const policyName of new Set(policyNames)) {
      assert.ok(rowText.includes(`\`${policyName}\``), `${rowName} 必须记录 ${policyName}`);
    }
  }

  for (const policyName of installPreservedLocalOnlyPaths) {
    assert.ok(policySection.includes(`\`${policyName}\``), `local-only 说明必须记录 ${policyName}`);
  }

  for (const policyName of [
    ...configTomlPolicy.install.preservedTopLevelKeys,
    ...configTomlPolicy.install.preservedTopLevelTables,
    ...pathNames(configTomlPolicy.install.preservedNestedPaths),
    ...configTomlPolicy.install.removedTopLevelKeys,
    ...pathNames(configTomlPolicy.install.removedNestedPaths)
  ]) {
    assert.ok(policySection.includes(`\`${policyName}\``), `安装行为说明必须记录 ${policyName}`);
  }

  assert.match(policySection, /`apps` 整张 table 不会上传/);
  assert.match(policySection, /`local_mcp` 不会上传/);
  assert.match(policySection, /snapshot 不包含 `apps`[^\n]*本机 `apps` 会完整保留/);
  assert.match(policySection, /`mcp_servers`[\s\S]*按名称合并/);

  for (const pathSegments of [
    ...configTomlPolicy.sync.excludedTopLevelKeys.map((key) => [key]),
    ...configTomlPolicy.sync.excludedNestedPaths
  ]) {
    assert.ok(exampleHasPath(pathSegments), `TOML 示例必须包含 ${pathSegments.join('.')}`);
  }

  assert.match(readme, /文件会完整复制, 不应用下面的同步排除规则/);
  assert.match(policySection, /备份会原样保留上述配置/);
});

test('publish-sync excludes sandbox_workspace_write.writable_roots from managed output', () => {
  const localConfig = {
    sandbox_workspace_write: {
      network_access: true,
      writable_roots: [
        'C:\\local-one',
        'D:\\local-two'
      ]
    }
  };

  const managedConfig = {
    sandbox_workspace_write: {
      network_access: true,
      writable_roots: [
        'C:\\managed-only'
      ]
    }
  };

  assert.deepStrictEqual(
    buildPublishedSyncConfig(localConfig, managedConfig),
    {
      sandbox_workspace_write: {
        network_access: true
      }
    }
  );
});

test('publish-sync excludes tui.model_availability_nux from managed output', () => {
  const localConfig = {
    tui: {
      status_line: [
        'current-dir',
        'model-with-reasoning'
      ],
      model_availability_nux: {
        'gpt-5.5': 2
      }
    }
  };

  const managedConfig = {
    tui: {
      status_line: [
        'current-dir'
      ],
      model_availability_nux: {
        'gpt-5.5': 1
      }
    }
  };

  assert.deepStrictEqual(
    buildPublishedSyncConfig(localConfig, managedConfig),
    {
      tui: {
        status_line: [
          'current-dir',
          'model-with-reasoning'
        ]
      }
    }
  );
});

test('publish-sync excludes top-level model_catalog_json from managed output', () => {
  const localConfig = {
    model_catalog_json: '~/.codex/model_catalog.json',
    tui: {
      status_line: [
        'current-dir',
        'model-with-reasoning'
      ]
    }
  };

  const managedConfig = {
    model_catalog_json: '~/.codex/model_catalog.json',
    tui: {
      status_line: [
        'current-dir'
      ]
    }
  };

  assert.deepStrictEqual(
    buildPublishedSyncConfig(localConfig, managedConfig),
    {
      tui: {
        status_line: [
          'current-dir',
          'model-with-reasoning'
        ]
      }
    }
  );
});

test('merge-install CLI writes model keys at the top of the output file', () => {
  withTempDir((tempDir) => {
    const sourcePath = join(tempDir, 'source.toml');
    const targetPath = join(tempDir, 'target.toml');
    const outputPath = join(tempDir, 'output.toml');

    writeFileSync(
      sourcePath,
      [
        'approval_policy = "never"',
        '',
        '[features]',
        'runtime_metrics = true',
        ''
      ].join('\n'),
      'utf8'
    );

    writeFileSync(
      targetPath,
      [
        'model = "gpt-5.4"',
        'model_reasoning_effort = "medium"',
        'service_tier = "fast"',
        ''
      ].join('\n'),
      'utf8'
    );

    const result = spawnSync(
      process.execPath,
      [
        'tools/config-toml-ops.cjs',
        'merge-install',
        '--source',
        sourcePath,
        '--target',
        targetPath,
        '--output',
        outputPath
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8'
      }
    );

    assert.equal(result.status, 0, result.stderr);
    assert.match(
      readFileSync(outputPath, 'utf8'),
      /^model = "gpt-5\.4"\nmodel_reasoning_effort = "medium"\napproval_policy = "never"/
    );
  });
});

test('publish-sync CLI drops managed keys that are missing locally', () => {
  withTempDir((tempDir) => {
    const localPath = join(tempDir, 'local.toml');
    const managedPath = join(tempDir, 'managed.toml');
    const outputPath = join(tempDir, 'output.toml');

    writeFileSync(
      localPath,
      [
        'model = "gpt-5.4"',
        'model_reasoning_effort = "medium"',
        '',
        '[features]',
        'runtime_metrics = true',
        '',
        '[notice]',
        'hide_full_access_warning = true',
        '',
        '[notice.model_migrations]',
        '"gpt-5.1-codex-max" = "gpt-5.3-codex"',
        '',
        '[windows]',
        'sandbox = "elevated"',
        ''
      ].join('\n'),
      'utf8'
    );

    writeFileSync(
      managedPath,
      [
        'model = "gpt-5.3-codex"',
        'model_reasoning_effort = "high"',
        '',
        '[features]',
        'runtime_metrics = false',
        '',
        '[notice]',
        'hide_full_access_warning = false',
        '',
        '[notice.model_migrations]',
        '"gpt-5.1-codex-max" = "gpt-5.3-codex"',
        '',
        '[sandbox_workspace_write]',
        'network_access = true',
        ''
      ].join('\n'),
      'utf8'
    );

    const result = spawnSync(
      process.execPath,
      [
        'tools/config-toml-ops.cjs',
        'publish-sync',
        '--local',
        localPath,
        '--managed',
        managedPath,
        '--output',
        outputPath
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8'
      }
    );

    assert.equal(result.status, 0, result.stderr);
    assert.deepStrictEqual(
      TOML.parse(readFileSync(outputPath, 'utf8')),
      {
        features: {
          runtime_metrics: true
        },
        notice: {
          hide_full_access_warning: true
        }
      }
    );
  });
});

test('publish-sync replaces the complete managed agents table while excluding local-only keys', () => {
  const localConfig = {
    model: 'gpt-5.4',
    model_context_window: 200000,
    model_reasoning_effort: 'medium',
    plan_mode_reasoning_effort: 'low',
    agents: {
      reviewer: {
        model: 'gpt-5.4'
      },
      explorer: {
        config_file: './agents/explorer.toml'
      }
    },
    service_tier: 'fast',
    notice: {
      hide_full_access_warning: true,
      model_migrations: {
        'gpt-5.1-codex-max': 'gpt-5.3-codex'
      }
    },
    windows: {
      sandbox: 'elevated'
    }
  };

  const managedConfig = {
    agents: {
      reviewer: {
        model: 'gpt-5.3-codex'
      }
    },
    model: 'gpt-5.3-codex',
    model_context_window: 100000,
    model_reasoning_effort: 'high',
    service_tier: 'default',
    plan_mode_reasoning_effort: 'xhigh',
    notice: {
      hide_full_access_warning: false,
      model_migrations: {
        'gpt-5.1-codex-max': 'gpt-5.3-codex'
      }
    },
    windows: {
      sandbox: 'workspace-write'
    }
  };

  assert.deepStrictEqual(
    buildPublishedSyncConfig(localConfig, managedConfig),
    {
      agents: {
        reviewer: {
          model: 'gpt-5.4'
        },
        explorer: {
          config_file: './agents/explorer.toml'
        }
      },
      notice: {
        hide_full_access_warning: true
      },
      windows: {
        sandbox: 'elevated'
      }
    }
  );
});

test('CLI returns a non-zero exit code for invalid TOML input', () => {
  withTempDir((tempDir) => {
    const sourcePath = join(tempDir, 'source.toml');
    const targetPath = join(tempDir, 'target.toml');
    const outputPath = join(tempDir, 'output.toml');

    writeFileSync(sourcePath, 'model = \n', 'utf8');
    writeFileSync(targetPath, 'model = "gpt-5.4"\n', 'utf8');

    const result = spawnSync(
      process.execPath,
      [
        'tools/config-toml-ops.cjs',
        'merge-install',
        '--source',
        sourcePath,
        '--target',
        targetPath,
        '--output',
        outputPath
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8'
      }
    );

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Failed to parse TOML/);
  });
});
