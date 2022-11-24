async function main() {
	const axios = require('axios')
	const util = require('util');
        const fs = require('fs');
	const exec = util.promisify(require('child_process').exec);

        let rawdata = await fs.readFileSync('sites.json');
        let nodes = await JSON.parse(rawdata);
        rawdata = await fs.readFileSync('config.json');
        let config = await JSON.parse(rawdata);

	axios.defaults.withCredentials = true;
	let message = ""
	let todo = false
	for (var a = 0; a < nodes.length; a++) {
		node = nodes[a].site
		console.log(node)
		let url = nodes[a].site
		try {
		  let login = await axios.post(url + "/sessions", {"email":nodes[a].user, "password":nodes[a].pass})
		  cookie = login.headers['set-cookie']
		} catch(e) {
	          console.log(node, "not working")
		  continue
		}

		body = "{\"operationName\":\"FetchFeedManagersWithProposals\",\"variables\":{},\"query\":\"fragment FeedsManager_ChainConfigFields on FeedsManagerChainConfig {\\n  id\\n  chainID\\n  chainType\\n  accountAddr\\n  adminAddr\\n  fluxMonitorJobConfig {\\n    enabled\\n    __typename\\n  }\\n  ocr1JobConfig {\\n    enabled\\n    isBootstrap\\n    multiaddr\\n    p2pPeerID\\n    keyBundleID\\n    __typename\\n  }\\n  ocr2JobConfig {\\n    enabled\\n    isBootstrap\\n    multiaddr\\n    p2pPeerID\\n    keyBundleID\\n    __typename\\n  }\\n  __typename\\n}\\n\\nfragment FeedsManagerFields on FeedsManager {\\n  id\\n  name\\n  uri\\n  publicKey\\n  isConnectionActive\\n  chainConfigs {\\n    ...FeedsManager_ChainConfigFields\\n    __typename\\n  }\\n  __typename\\n}\\n\\nfragment FeedsManager_JobProposalsFields on JobProposal {\\n  id\\n  externalJobID\\n  remoteUUID\\n  status\\n  pendingUpdate\\n  latestSpec {\\n    createdAt\\n    version\\n    __typename\\n  }\\n  __typename\\n}\\n\\nfragment FeedsManagerPayload_ResultsFields on FeedsManager {\\n  ...FeedsManagerFields\\n  jobProposals {\\n    ...FeedsManager_JobProposalsFields\\n    __typename\\n  }\\n  __typename\\n}\\n\\nquery FetchFeedManagersWithProposals {\\n  feedsManagers {\\n    results {\\n      ...FeedsManagerPayload_ResultsFields\\n      __typename\\n    }\\n    __typename\\n  }\\n}\\n\"}"
		let response = await axios.post(url + "/query", body, {
			withCredentials: true,
			headers: {
		                Cookie: cookie
            		}
		})

		try {
			proposals = response.data.data.feedsManagers.results[0].jobProposals
			for (var b=0; b<proposals.length; b++) {
				console.log(proposals[b])
				if (proposals[b].status != "APPROVED" && proposals[b].status != "CANCELLED || config.dryrun) {
					console.log("unapproved change on node " + node)
					message = message + "unapproved change on node " + node + "\n"
					todo = true
				}
				if (proposals[b].status == "APPROVED" && proposals[b].pendingUpdate || config.dryrun) {
					console.log("unapproved update on node " + node)
					message = message + "unapproved update on node " + node + "\n"
					todo = true
				}
			
			}
		} catch (e) {}
		// process.exit()
	}
	if (todo) {
		message = "Unprocessed Jobrequests on Chainlink" + "\n" + message
		console.log("MESSAGE:\n" + message)
                if (config.slack) {
			await axios.post(config.slackurl, {"text":message})
		}
		if (config.telegram) {
			await axios.post("https://api.telegram.org/bot" + config.telegram_token + "/sendMessage", {"chat_id": config.telegram_channel,"text":message})
		}
	}

} // END main()

main()
